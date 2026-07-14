import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin/session";
import { computeLeaderboardSnapshot } from "@/lib/gamification/leaderboard";

export async function POST(req: NextRequest) {
  if (!isAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const periodStart = body?.periodStart;
  if (typeof periodStart !== "string") {
    return NextResponse.json({ error: "periodStart (YYYY-MM-DD) is required" }, { status: 400 });
  }

  const count = await computeLeaderboardSnapshot(periodStart);
  return NextResponse.json({ ranked: count });
}
