import { query } from "@/lib/db";

// Weekly cache, not computed live — call from an admin trigger or a cron
// job at period end. periodStart should be the Monday of the week being
// snapshotted (matches the streak module's week boundary).
export async function computeLeaderboardSnapshot(periodStart: string): Promise<number> {
  const { rows } = await query<{ user_id: string; score_minor: string }>(
    `SELECT user_id, SUM(amount_minor) AS score_minor
     FROM transactions
     WHERE status = 'delivered' AND currency = 'NGN'
       AND created_at >= $1::date AND created_at < $1::date + interval '7 days'
     GROUP BY user_id
     ORDER BY score_minor DESC
     LIMIT 100`,
    [periodStart]
  );

  let rank = 1;
  for (const row of rows) {
    await query(
      `INSERT INTO leaderboard_snapshots (period_start, user_id, rank, score_minor)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (period_start, user_id) DO UPDATE SET rank = EXCLUDED.rank, score_minor = EXCLUDED.score_minor`,
      [periodStart, row.user_id, rank, row.score_minor]
    );
    rank += 1;
  }

  return rows.length;
}
