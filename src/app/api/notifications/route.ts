import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { rows } = await query(
    `SELECT id, channel, kind, title, body, read_at, created_at FROM notifications
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
    [userId]
  );
  return NextResponse.json({ notifications: rows });
}

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = body?.id;
  if (typeof id !== "string") return NextResponse.json({ error: "id is required" }, { status: 400 });

  // Opening a campaign-driven notification counts as both "opened" and
  // "clicked" for campaign analytics — a deliberate simplification rather
  // than building a separate in-notification CTA-link click system.
  await query(
    `UPDATE notifications
     SET read_at = now(), clicked_at = CASE WHEN campaign_id IS NOT NULL THEN now() ELSE clicked_at END
     WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
    [id, userId]
  );
  return NextResponse.json({ ok: true });
}
