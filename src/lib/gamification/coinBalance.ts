import { query } from "@/lib/db";

// Cached balance for fast reads — source of truth is still
// SUM(reward_events.coins), same cache-plus-ledger pattern as account
// balances. Call this every time a reward_events row is inserted.
export async function bumpCoinBalance(userId: string, delta: number): Promise<void> {
  await query(
    `INSERT INTO user_coin_balances (user_id, coins) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET coins = user_coin_balances.coins + EXCLUDED.coins, updated_at = now()`,
    [userId, delta]
  );
}

export async function recomputeCoinBalance(userId: string): Promise<number> {
  const { rows } = await query<{ total: string | null }>(
    `SELECT SUM(coins) AS total FROM reward_events WHERE user_id = $1`,
    [userId]
  );
  return rows[0]?.total ? Number(rows[0].total) : 0;
}
