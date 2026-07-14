import { query } from "@/lib/db";

export async function createSquad(name: string, createdBy: string): Promise<{ squadId: string }> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO squads (name, created_by) VALUES ($1, $2) RETURNING id`,
    [name, createdBy]
  );
  await query(`INSERT INTO squad_members (squad_id, user_id) VALUES ($1, $2)`, [rows[0].id, createdBy]);
  return { squadId: rows[0].id };
}

export async function joinSquad(squadId: string, userId: string): Promise<void> {
  await query(
    `INSERT INTO squad_members (squad_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [squadId, userId]
  );
}

function isoWeekStartDateString(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

// Called after a delivered purchase — bumps progress on every open goal for
// every squad the user belongs to this week, marking it fulfilled the
// instant the target is met.
export async function updateSquadGoalProgress(userId: string): Promise<void> {
  const periodStart = isoWeekStartDateString(new Date());

  const { rows: squads } = await query<{ squad_id: string }>(
    `SELECT squad_id FROM squad_members WHERE user_id = $1`,
    [userId]
  );

  for (const { squad_id } of squads) {
    await query(
      `INSERT INTO squad_goals (squad_id, period_start, target_txn_count, current_txn_count)
       VALUES ($1, $2, 10, 0)
       ON CONFLICT (squad_id, period_start) DO NOTHING`,
      [squad_id, periodStart]
    );
    await query(
      `UPDATE squad_goals
       SET current_txn_count = current_txn_count + 1,
           fulfilled = (current_txn_count + 1 >= target_txn_count)
       WHERE squad_id = $1 AND period_start = $2 AND fulfilled = false`,
      [squad_id, periodStart]
    );
  }
}
