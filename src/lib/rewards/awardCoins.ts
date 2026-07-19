import { query, withTransaction } from "@/lib/db";
import { bumpCoinBalance } from "@/lib/gamification/coinBalance";
import { completeMission } from "@/lib/gamification/missions";
import { postJournal } from "@/lib/ledger/postJournal";
import { getOrCreateAccount, getUserWalletAccount } from "@/lib/ledger/accounts";
import { usdMinorToNgnMinor } from "@/lib/fx";
import { logAudit } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications/send";

const COINS_PER_100_NGN = 1;
const REFERRAL_WELCOME_COINS = 50; // referee's one-time welcome on first purchase

// Referral cash program: the referrer earns $10 once the friend they invited has
// transacted at least $100 (cumulative, delivered). Denominated in USD but paid
// as NGN wallet product credit at today's rate — like all Phase 1 rewards it is
// spend-only (no withdrawal path), never withdrawable cash.
const REFERRAL_REWARD_USD_MINOR = 1000; // $10
const REFERRAL_QUALIFY_USD_MINOR = 10000; // $100

// Transaction types that count as the referred user's own spend.
const SPEND_TXN_TYPES = [
  "airtime",
  "data",
  "cable",
  "electricity",
  "exam_pin",
  "betting",
  "gift_card",
  "intl_topup",
  "intl_data",
  "esim",
];

// 1 coin per ₦100 spent on a delivered purchase.
export async function awardPurchaseCoins(userId: string, txnId: string, amountMinor: number): Promise<void> {
  const coins = Math.floor(amountMinor / 10000) * COINS_PER_100_NGN;
  if (coins <= 0) return;

  await query(
    `INSERT INTO reward_events (user_id, kind, coins, credit_minor, meta) VALUES ($1, 'coins_earn', $2, 0, $3)`,
    [userId, coins, JSON.stringify({ txnId })]
  );
  await bumpCoinBalance(userId, coins);
}

// Called after each delivered purchase by the referred user. Two independent,
// idempotent payouts:
//   1. Referee welcome — 50 coins, once, on their first delivered purchase.
//   2. Referrer cash — $10 (as NGN wallet credit), once, when the referee's
//      cumulative delivered spend reaches $100.
export async function awardReferralBonusIfEligible(userId: string): Promise<void> {
  const { rows: userRows } = await query<{ referred_by: string | null }>(
    `SELECT referred_by FROM users WHERE id = $1`,
    [userId]
  );
  const referredBy = userRows[0]?.referred_by;
  if (!referredBy) return;

  // (1) Referee welcome coins — once, guarded by a role='referee' marker.
  const { rows: welcomed } = await query<{ id: string }>(
    `SELECT id FROM reward_events WHERE user_id = $1 AND kind = 'referral' AND meta->>'role' = 'referee'`,
    [userId]
  );
  if (welcomed.length === 0) {
    await query(
      `INSERT INTO reward_events (user_id, kind, coins, credit_minor, meta) VALUES ($1, 'referral', $2, 0, $3)`,
      [userId, REFERRAL_WELCOME_COINS, JSON.stringify({ role: "referee" })]
    );
    await bumpCoinBalance(userId, REFERRAL_WELCOME_COINS);
    await completeMission(referredBy, "refer_a_friend");
  }

  // (2) Referrer cash — only once the friend has transacted $100+.
  await payReferrerCashIfQualified(userId, referredBy);
}

async function payReferrerCashIfQualified(refereeId: string, referrerId: string): Promise<void> {
  // Already paid for this friend? The conversion row is the fast guard; the
  // transactions UNIQUE(user_id, idempotency_key) below is the hard one.
  const { rows: conv } = await query<{ status: string }>(
    `SELECT status FROM referral_conversions WHERE referred_user_id = $1`,
    [refereeId]
  );
  if (conv[0]?.status === "paid") return;

  const { rows: spentRows } = await query<{ spent: string | null }>(
    `SELECT SUM(amount_minor) AS spent FROM transactions
     WHERE user_id = $1 AND status = 'delivered' AND type = ANY($2::text[])`,
    [refereeId, SPEND_TXN_TYPES]
  );
  const spentNgnMinor = spentRows[0]?.spent ? Number(spentRows[0].spent) : 0;

  const qualifyNgnMinor = await usdMinorToNgnMinor(REFERRAL_QUALIFY_USD_MINOR);
  if (spentNgnMinor < qualifyNgnMinor) return;

  const rewardNgnMinor = await usdMinorToNgnMinor(REFERRAL_REWARD_USD_MINOR);
  const walletAccountId = await getUserWalletAccount(referrerId, "NGN");
  const expenseAccountId = await getOrCreateAccount("platform", null, "NGN", "expense");

  try {
    await withTransaction(async (client) => {
      // Lock the conversion row so two concurrent purchases can't both pay out.
      const locked = await client.query<{ status: string }>(
        `SELECT status FROM referral_conversions WHERE referred_user_id = $1 FOR UPDATE`,
        [refereeId]
      );
      if (locked.rows[0]?.status === "paid") return;

      const txnRes = await client.query(
        `INSERT INTO transactions (user_id, idempotency_key, type, status, currency, amount_minor)
         VALUES ($1, $2, 'reward_credit', 'delivered', 'NGN', $3) RETURNING id`,
        [referrerId, `referral_credit:${refereeId}`, rewardNgnMinor]
      );
      const txnId = (txnRes.rows[0] as { id: string }).id;
      const posted = await postJournal(
        {
          txnId,
          journalType: "reward",
          description: "Referral reward ($10)",
          entries: [
            { accountId: expenseAccountId, amountMinor: -rewardNgnMinor, currency: "NGN" },
            { accountId: walletAccountId, amountMinor: rewardNgnMinor, currency: "NGN" },
          ],
        },
        client as never
      );
      await client.query(`UPDATE transactions SET journal_id = $2 WHERE id = $1`, [txnId, posted.journalId]);
      await client.query(
        `INSERT INTO transaction_events (txn_id, from_status, to_status) VALUES ($1, NULL, 'delivered')`,
        [txnId]
      );
      await client.query(
        `INSERT INTO reward_events (user_id, kind, coins, credit_minor, meta) VALUES ($1, 'referral', 0, $2, $3)`,
        [referrerId, rewardNgnMinor, JSON.stringify({ role: "referrer", referredUserId: refereeId, usdMinor: REFERRAL_REWARD_USD_MINOR })]
      );
      await client.query(
        `UPDATE referral_conversions SET status = 'paid', referrer_credit_minor = $2 WHERE referred_user_id = $1`,
        [refereeId, rewardNgnMinor]
      );
    });
  } catch (err) {
    // A concurrent purchase already inserted the same credit key — that request
    // paid the reward, so this one is a no-op, not an error.
    if ((err as { code?: string }).code === "23505") return;
    throw err;
  }

  await logAudit(referrerId, "referral_reward", "user", refereeId, { rewardNgnMinor, usdMinor: REFERRAL_REWARD_USD_MINOR });
  await sendNotification(
    referrerId,
    "push",
    "txn_receipt",
    "You earned a referral reward! 🎉",
    `Your friend hit $100 — $10 (₦${(rewardNgnMinor / 100).toLocaleString()}) landed in your wallet.`
  );
}
