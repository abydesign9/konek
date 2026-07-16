import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { listActiveTourSteps } from "@/lib/onboarding/tourSteps";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { rows } = await query<{ onboarding_completed_at: string | null }>(
    `SELECT onboarding_completed_at FROM users WHERE id = $1`,
    [userId]
  );
  const completed = rows[0]?.onboarding_completed_at != null;
  const steps = completed ? [] : await listActiveTourSteps();
  return NextResponse.json({ completed, steps });
}

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await query(`UPDATE users SET onboarding_completed_at = now() WHERE id = $1 AND onboarding_completed_at IS NULL`, [userId]);
  return NextResponse.json({ ok: true });
}
