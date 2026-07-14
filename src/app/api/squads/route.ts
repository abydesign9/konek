import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { createSquad } from "@/lib/gamification/squads";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { rows: mySquads } = await query(
    `SELECT s.id, s.name, (SELECT count(*) FROM squad_members WHERE squad_id = s.id) AS member_count
     FROM squads s JOIN squad_members sm ON sm.squad_id = s.id
     WHERE sm.user_id = $1`,
    [userId]
  );

  const squadsWithGoals = [];
  for (const squad of mySquads) {
    const { rows: goal } = await query(
      `SELECT target_txn_count, current_txn_count, fulfilled, reward_desc FROM squad_goals
       WHERE squad_id = $1 ORDER BY period_start DESC LIMIT 1`,
      [squad.id]
    );
    squadsWithGoals.push({ ...squad, goal: goal[0] ?? null });
  }

  return NextResponse.json({ squads: squadsWithGoals });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = body?.name;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const result = await createSquad(name.trim(), userId);
  return NextResponse.json(result);
}
