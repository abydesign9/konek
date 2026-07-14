import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const periodStart = req.nextUrl.searchParams.get("periodStart");
  const params: unknown[] = [];
  let sql = `SELECT ls.rank, ls.score_minor, u.phone FROM leaderboard_snapshots ls JOIN users u ON u.id = ls.user_id`;
  if (periodStart) {
    params.push(periodStart);
    sql += ` WHERE ls.period_start = $1`;
  } else {
    sql += ` WHERE ls.period_start = (SELECT MAX(period_start) FROM leaderboard_snapshots)`;
  }
  sql += ` ORDER BY ls.rank ASC LIMIT 20`;

  const { rows } = await query(sql, params);
  return NextResponse.json({ leaderboard: rows });
}
