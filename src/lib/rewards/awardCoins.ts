import { query } from "@/lib/db";

const COINS_PER_100_NGN = 1;
const REFERRAL_BONUS_COINS = 50;

// 1 coin per ₦100 spent on a delivered purchase.
export async function awardPurchaseCoins(userId: string, txnId: string, amountMinor: number): Promise<void> {
  const coins = Math.floor(amountMinor / 10000) * COINS_PER_100_NGN;
  if (coins <= 0) return;

  await query(
    `INSERT INTO reward_events (user_id, kind, coins, credit_minor, meta) VALUES ($1, 'coins_earn', $2, 0, $3)`,
    [userId, coins, JSON.stringify({ txnId })]
  );
}

// Pays out once, on the referred user's first delivered transaction — both
// sides get coins. Idempotent: checks for an existing referral reward
// before paying out again.
export async function awardReferralBonusIfEligible(userId: string): Promise<void> {
  const { rows: userRows } = await query<{ referred_by: string | null }>(
    `SELECT referred_by FROM users WHERE id = $1`,
    [userId]
  );
  const referredBy = userRows[0]?.referred_by;
  if (!referredBy) return;

  const { rows: existing } = await query<{ id: string }>(
    `SELECT id FROM reward_events WHERE user_id = $1 AND kind = 'referral'`,
    [userId]
  );
  if (existing.length > 0) return;

  await query(
    `INSERT INTO reward_events (user_id, kind, coins, credit_minor, meta) VALUES ($1, 'referral', $2, 0, $3)`,
    [userId, REFERRAL_BONUS_COINS, JSON.stringify({ role: "referee" })]
  );
  await query(
    `INSERT INTO reward_events (user_id, kind, coins, credit_minor, meta) VALUES ($1, 'referral', $2, 0, $3)`,
    [referredBy, REFERRAL_BONUS_COINS, JSON.stringify({ role: "referrer", referredUserId: userId })]
  );
}
