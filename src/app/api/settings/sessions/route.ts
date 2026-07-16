import { NextResponse } from "next/server";
import { getCurrentSessionId, getSessionUserId, touchCurrentSession } from "@/lib/auth/session";
import { query } from "@/lib/db";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  await touchCurrentSession();
  const currentSessionId = await getCurrentSessionId();

  const { rows } = await query<{
    id: string;
    user_agent: string | null;
    ip: string | null;
    created_at: string;
    last_seen_at: string;
    expires_at: string;
  }>(
    `SELECT id, user_agent, ip, created_at, last_seen_at, expires_at
     FROM sessions WHERE user_id = $1 AND expires_at > now() ORDER BY last_seen_at DESC`,
    [userId]
  );

  return NextResponse.json({ sessions: rows, currentSessionId });
}
