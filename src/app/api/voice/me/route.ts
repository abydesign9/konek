import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { rows: bundleRows } = await query<{ remaining: string | null }>(
    `SELECT SUM(minutes_granted - minutes_used) AS remaining FROM minutes_bundles
     WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > now())`,
    [userId]
  );
  const { rows: calls } = await query(
    `SELECT to_number, duration_seconds, cost_minor, billed_minutes_from_bundle, status, created_at
     FROM call_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [userId]
  );

  return NextResponse.json({
    minutesRemaining: bundleRows[0]?.remaining ? Math.max(0, Number(bundleRows[0].remaining)) : 0,
    calls,
  });
}
