import { query } from "@/lib/db";

function isoWeekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; // Mon=1 .. Sun=7
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));
  return d;
}

// Called after every delivered purchase. A "qualifying week" is any
// calendar week (Mon-Sun) with at least one delivered transaction —
// consecutive qualifying weeks build the streak.
export async function updateStreak(userId: string): Promise<void> {
  const { rows } = await query<{ current_streak_weeks: number; longest_streak_weeks: number; last_qualifying_txn_at: string | null }>(
    `INSERT INTO streaks (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING current_streak_weeks, longest_streak_weeks, last_qualifying_txn_at`,
    [userId]
  );
  const row = rows[0];

  const now = new Date();
  const thisWeekStart = isoWeekStart(now);

  if (!row.last_qualifying_txn_at) {
    await query(
      `UPDATE streaks SET current_streak_weeks = 1, longest_streak_weeks = GREATEST(longest_streak_weeks, 1), last_qualifying_txn_at = now(), updated_at = now() WHERE user_id = $1`,
      [userId]
    );
    return;
  }

  const lastWeekStart = isoWeekStart(new Date(row.last_qualifying_txn_at));
  const weeksDiff = Math.round((thisWeekStart.getTime() - lastWeekStart.getTime()) / (7 * 86_400_000));

  if (weeksDiff === 0) {
    // Already qualified this week — just bump the timestamp.
    await query(`UPDATE streaks SET last_qualifying_txn_at = now(), updated_at = now() WHERE user_id = $1`, [userId]);
    return;
  }

  const newStreak = weeksDiff === 1 ? row.current_streak_weeks + 1 : 1;
  await query(
    `UPDATE streaks SET current_streak_weeks = $2, longest_streak_weeks = GREATEST(longest_streak_weeks, $2), last_qualifying_txn_at = now(), updated_at = now() WHERE user_id = $1`,
    [userId, newStreak]
  );
}
