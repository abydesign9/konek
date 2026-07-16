import { NextResponse } from "next/server";
import { getCurrentSessionId, getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const currentSessionId = await getCurrentSessionId();
  if (params.id === currentSessionId) {
    return NextResponse.json({ error: "Use log out to end your current session" }, { status: 400 });
  }

  const { rowCount } = await query(`DELETE FROM sessions WHERE id = $1 AND user_id = $2`, [params.id, userId]);
  if (!rowCount) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  await logAudit(userId, "session_revoked", "session", params.id);
  return NextResponse.json({ ok: true });
}
