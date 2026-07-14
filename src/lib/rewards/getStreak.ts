import { query } from "@/lib/db";

// Consecutive calendar days (ending today or yesterday — a purchase today
// isn't required to keep yesterday's streak "alive" until midnight) with at
// least one delivered transaction.
export async function getStreak(userId: string): Promise<number> {
  const { rows } = await query<{ day: string }>(
    `SELECT DISTINCT date_trunc('day', created_at) AS day FROM transactions
     WHERE user_id = $1 AND status = 'delivered'
     ORDER BY day DESC
     LIMIT 400`,
    [userId]
  );
  if (rows.length === 0) return 0;

  const days = rows.map((r) => new Date(r.day).getTime());
  const dayMs = 86_400_000;
  const today = Math.floor(Date.now() / dayMs) * dayMs;

  let streak = 0;
  let cursor = today;

  if (days[0] !== today && days[0] !== today - dayMs) {
    return 0; // most recent activity isn't today or yesterday — streak broken
  }
  if (days[0] === today - dayMs) cursor = today - dayMs;

  for (const day of days) {
    if (day === cursor) {
      streak += 1;
      cursor -= dayMs;
    } else if (day < cursor) {
      break;
    }
  }

  return streak;
}
