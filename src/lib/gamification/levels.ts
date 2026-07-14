import { query } from "@/lib/db";

// Lifetime NGN spend across delivered transactions decides level — call
// after every delivered purchase. Upserts only when the user actually
// crosses into a new (higher) level.
export async function computeAndUpdateLevel(userId: string): Promise<void> {
  const { rows: spendRows } = await query<{ total: string | null }>(
    `SELECT SUM(amount_minor) AS total FROM transactions WHERE user_id = $1 AND status = 'delivered' AND currency = 'NGN'`,
    [userId]
  );
  const lifetimeSpendMinor = spendRows[0]?.total ? Number(spendRows[0].total) : 0;

  const { rows: levelRows } = await query<{ id: number; name: string }>(
    `SELECT id, name FROM levels WHERE currency = 'NGN' AND min_lifetime_spend_minor <= $1 ORDER BY min_lifetime_spend_minor DESC LIMIT 1`,
    [lifetimeSpendMinor]
  );
  const target = levelRows[0];
  if (!target) return;

  const { rows: currentRows } = await query<{ level_id: number }>(
    `SELECT level_id FROM user_levels WHERE user_id = $1`,
    [userId]
  );
  if (currentRows[0]?.level_id === target.id) return;

  await query(
    `INSERT INTO user_levels (user_id, level_id) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET level_id = EXCLUDED.level_id, achieved_at = now()`,
    [userId, target.id]
  );
}
