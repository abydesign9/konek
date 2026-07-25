import { query } from "@/lib/db";
import { postJournal } from "@/lib/ledger/postJournal";
import { getOrCreateAccount, getUserWalletAccount, getPlatformAccount } from "@/lib/ledger/accounts";
import { withIdempotency } from "@/lib/idempotency";
import { logAudit } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications/send";
import {
  canClaim,
  cashbackMinor,
  isLive,
  spendCounts,
  unlockSatisfied,
  type Promo,
} from "./engine";

// DB layer for the promotions engine. Cash rewards land in the user's bonus
// ledger account (locked) and move to the main wallet once unlock conditions are
// met. Every credit is idempotent and audited; caps are enforced before paying.

interface PromoRow {
  id: string;
  promo_type: string;
  reward_type: string;
  target_audience: "NG" | "INTL" | "ALL";
  reward_amount_minor: string;
  reward_currency: string;
  cashback_pct: string | null;
  min_deposit_minor: string;
  min_spend_minor: string;
  valid_spend_types: string[];
  milestone_minor: string | null;
  start_date: string;
  end_date: string | null;
  user_cap: number | null;
  budget_cap_minor: string | null;
  total_claimed: number;
  total_paid_out_minor: string;
  status: string;
  notification_message: string | null;
  reward_expiry_days: number | null;
}

function toPromo(r: PromoRow): Promo {
  return {
    id: r.id,
    promoType: r.promo_type,
    rewardType: r.reward_type,
    targetAudience: r.target_audience,
    rewardAmountMinor: Number(r.reward_amount_minor),
    rewardCurrency: r.reward_currency,
    cashbackPct: r.cashback_pct == null ? null : Number(r.cashback_pct),
    minDepositMinor: Number(r.min_deposit_minor),
    minSpendMinor: Number(r.min_spend_minor),
    validSpendTypes: r.valid_spend_types,
    milestoneMinor: r.milestone_minor == null ? null : Number(r.milestone_minor),
    startDate: r.start_date,
    endDate: r.end_date,
    userCap: r.user_cap,
    budgetCapMinor: r.budget_cap_minor == null ? null : Number(r.budget_cap_minor),
    totalClaimed: r.total_claimed,
    totalPaidOutMinor: Number(r.total_paid_out_minor),
    status: r.status,
  };
}

const PROMO_COLS = `id, promo_type, reward_type, target_audience, reward_amount_minor, reward_currency,
  cashback_pct, min_deposit_minor, min_spend_minor, valid_spend_types, milestone_minor, start_date, end_date,
  user_cap, budget_cap_minor, total_claimed, total_paid_out_minor, status, notification_message, reward_expiry_days`;

async function activePromosByType(promoType: string): Promise<PromoRow[]> {
  const { rows } = await query<PromoRow>(
    `SELECT ${PROMO_COLS} FROM promotions WHERE promo_type = $1 AND status = 'active'`,
    [promoType]
  );
  return rows;
}

async function userCountry(userId: string): Promise<string> {
  const { rows } = await query<{ country_code: string }>(`SELECT country_code FROM users WHERE id = $1`, [userId]);
  return (rows[0]?.country_code ?? "NG").toUpperCase();
}

// Credit a user's locked bonus account (platform promo expense -> user bonus).
async function creditBonusLocked(userId: string, amountMinor: number, currency: string, ref: string) {
  return withIdempotency(`promo_bonus:${ref}`, { userId, amountMinor }, async () => {
    const bonus = await getOrCreateAccount("user", userId, currency, "bonus");
    const expense = await getPlatformAccount(currency, "promo_expense");
    const { journalId } = await postJournal({
      journalType: "promo_bonus",
      description: "Promotion bonus (locked)",
      entries: [
        { accountId: expense, amountMinor: -amountMinor, currency },
        { accountId: bonus, amountMinor: amountMinor, currency },
      ],
    });
    return { journalId };
  });
}

// Grant a promo to a user exactly once. Returns true if newly granted.
async function grant(promo: Promo, userId: string, rewardExpiryDays: number | null): Promise<boolean> {
  // Idempotent claim row: only the first insert per (promo, user) proceeds.
  const inserted = await query<{ id: string }>(
    `INSERT INTO promo_claims (promo_id, user_id, status, reward_amount_minor, reward_currency, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (promo_id, user_id) DO NOTHING
     RETURNING id`,
    [
      promo.id,
      userId,
      promo.rewardType === "wallet_instant" ? "unlocked" : "granted_locked",
      promo.rewardAmountMinor,
      promo.rewardCurrency,
      null,
    ]
  );
  if (inserted.rowCount === 0) return false; // already claimed
  const claimId = inserted.rows[0].id;

  // Cash rewards move money now; non-cash rewards (fee waiver, free card,
  // discount, upgrade) are recorded as an entitlement the relevant flow checks.
  if (promo.rewardType === "wallet_instant" && promo.rewardAmountMinor > 0) {
    const wallet = await getUserWalletAccount(userId, promo.rewardCurrency);
    const expense = await getPlatformAccount(promo.rewardCurrency, "promo_expense");
    await withIdempotency(`promo_instant:${claimId}`, { userId }, async () => {
      const { journalId } = await postJournal({
        journalType: "promo_bonus",
        description: "Promotion bonus (instant)",
        entries: [
          { accountId: expense, amountMinor: -promo.rewardAmountMinor, currency: promo.rewardCurrency },
          { accountId: wallet, amountMinor: promo.rewardAmountMinor, currency: promo.rewardCurrency },
        ],
      });
      return { journalId };
    });
  } else if (promo.rewardType === "wallet_locked" && promo.rewardAmountMinor > 0) {
    await creditBonusLocked(userId, promo.rewardAmountMinor, promo.rewardCurrency, claimId);
    if (rewardExpiryDays && rewardExpiryDays > 0) {
      await query(`UPDATE promo_claims SET expires_at = now() + ($2 || ' days')::interval WHERE id = $1`, [
        claimId,
        String(rewardExpiryDays),
      ]);
    }
  }

  // Count the payout against the promo (for budget cap + reporting).
  await query(
    `UPDATE promotions SET total_claimed = total_claimed + 1,
            total_paid_out_minor = total_paid_out_minor + $2, updated_at = now() WHERE id = $1`,
    [promo.id, promo.rewardAmountMinor]
  );
  await logAudit(userId, "promo_granted", "promotion", promo.id, { claimId, rewardType: promo.rewardType });
  return true;
}

async function claimsCount(promoId: string, userId: string): Promise<number> {
  const { rows } = await query<{ c: string }>(
    `SELECT count(*)::int c FROM promo_claims WHERE promo_id = $1 AND user_id = $2`,
    [promoId, userId]
  );
  return Number(rows[0].c);
}

// --- Public trigger surface -------------------------------------------------

export async function grantSignupPromos(userId: string): Promise<void> {
  const country = await userCountry(userId);
  for (const row of await activePromosByType("signup")) {
    const promo = toPromo(row);
    if (canClaim(promo, country, await claimsCount(promo.id, userId))) await grant(promo, userId, row.reward_expiry_days);
  }
}

// Record a qualifying deposit (wallet funding, VA inflow) toward every locked
// claim, and auto-grant first_deposit / va_activation promos on the first one.
export async function recordDeposit(userId: string, amountMinor: number, currency: string, source: "funding" | "va_inflow"): Promise<void> {
  const country = await userCountry(userId);
  const promoType = source === "va_inflow" ? "va_activation" : "first_deposit";
  for (const row of await activePromosByType(promoType)) {
    const promo = toPromo(row);
    if (canClaim(promo, country, await claimsCount(promo.id, userId))) await grant(promo, userId, row.reward_expiry_days);
  }

  await query(
    `UPDATE promo_claims SET deposit_progress_minor = deposit_progress_minor + $3, updated_at = now()
      WHERE user_id = $1 AND status = 'granted_locked' AND reward_currency = $2`,
    [userId, currency, amountMinor]
  );
  await unlockEligible(userId);
}

// Record qualifying spend (VTU, bills, eSIM, card) toward locked claims.
export async function recordSpend(userId: string, amountMinor: number, currency: string, spendType: string): Promise<void> {
  const { rows } = await query<{ id: string; promo_id: string; valid_spend_types: string[] }>(
    `SELECT pc.id, pc.promo_id, p.valid_spend_types
       FROM promo_claims pc JOIN promotions p ON p.id = pc.promo_id
      WHERE pc.user_id = $1 AND pc.status = 'granted_locked' AND pc.reward_currency = $2`,
    [userId, currency]
  );
  for (const r of rows) {
    if (!spendCounts({ validSpendTypes: r.valid_spend_types }, spendType)) continue;
    await query(`UPDATE promo_claims SET spend_progress_minor = spend_progress_minor + $2, updated_at = now() WHERE id = $1`, [
      r.id,
      amountMinor,
    ]);
  }
  await unlockEligible(userId);
}

// Instant cashback to the locked bonus wallet for active card_cashback promos.
export async function cashbackOnCardSpend(userId: string, txnAmountMinor: number, currency: string): Promise<void> {
  const country = await userCountry(userId);
  for (const row of await activePromosByType("card_cashback")) {
    const promo = toPromo(row);
    if (!isLive(promo) || promo.rewardCurrency !== currency) continue;
    const amount = cashbackMinor(promo, txnAmountMinor);
    if (amount <= 0) continue;
    if (promo.budgetCapMinor != null && promo.totalPaidOutMinor + amount > promo.budgetCapMinor) continue;

    // Ensure a claim row exists to hold the running cashback + its unlock state.
    await query(
      `INSERT INTO promo_claims (promo_id, user_id, status, reward_amount_minor, reward_currency)
       VALUES ($1, $2, 'granted_locked', 0, $3) ON CONFLICT (promo_id, user_id) DO NOTHING`,
      [promo.id, userId, currency]
    );
    await creditBonusLocked(userId, amount, currency, `${promo.id}:${userId}:${Date.now()}`);
    await query(
      `UPDATE promo_claims SET reward_amount_minor = reward_amount_minor + $3, updated_at = now()
        WHERE promo_id = $1 AND user_id = $2`,
      [promo.id, userId, amount]
    );
    await query(
      `UPDATE promotions SET total_paid_out_minor = total_paid_out_minor + $2, updated_at = now() WHERE id = $1`,
      [promo.id, amount]
    );
    // Card spend also counts toward the same promo's unlock threshold.
    await query(
      `UPDATE promo_claims SET spend_progress_minor = spend_progress_minor + $3 WHERE promo_id = $1 AND user_id = $2`,
      [promo.id, userId, txnAmountMinor]
    );
  }
  await unlockEligible(userId);
}

// Move any now-eligible locked bonuses into the main wallet (withdrawable).
async function unlockEligible(userId: string): Promise<void> {
  const { rows } = await query<{
    id: string;
    reward_amount_minor: string;
    reward_currency: string;
    deposit_progress_minor: string;
    spend_progress_minor: string;
    min_deposit_minor: string;
    min_spend_minor: string;
  }>(
    `SELECT pc.id, pc.reward_amount_minor, pc.reward_currency, pc.deposit_progress_minor, pc.spend_progress_minor,
            p.min_deposit_minor, p.min_spend_minor
       FROM promo_claims pc JOIN promotions p ON p.id = pc.promo_id
      WHERE pc.user_id = $1 AND pc.status = 'granted_locked'
        AND (pc.expires_at IS NULL OR pc.expires_at > now())`,
    [userId]
  );

  for (const r of rows) {
    const amount = Number(r.reward_amount_minor);
    if (amount <= 0) continue;
    const ok = unlockSatisfied(
      { minDepositMinor: Number(r.min_deposit_minor), minSpendMinor: Number(r.min_spend_minor) },
      Number(r.deposit_progress_minor),
      Number(r.spend_progress_minor)
    );
    if (!ok) continue;

    await withIdempotency(`promo_unlock:${r.id}`, { userId }, async () => {
      const bonus = await getOrCreateAccount("user", userId, r.reward_currency, "bonus");
      const wallet = await getUserWalletAccount(userId, r.reward_currency);
      const { journalId } = await postJournal({
        journalType: "promo_unlock",
        description: "Promotion bonus unlocked",
        entries: [
          { accountId: bonus, amountMinor: -amount, currency: r.reward_currency },
          { accountId: wallet, amountMinor: amount, currency: r.reward_currency },
        ],
      });
      return { journalId };
    });
    await query(`UPDATE promo_claims SET status = 'unlocked', unlocked_at = now(), updated_at = now() WHERE id = $1`, [r.id]);
    await logAudit(userId, "promo_unlocked", "promo_claim", r.id, { amount, currency: r.reward_currency });
    await sendNotification(userId, "push", "txn_receipt", "Bonus unlocked", "Your promotion bonus is now available to spend or withdraw.");
  }
}
