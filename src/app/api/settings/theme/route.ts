import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";

const VALID_THEMES = ["light", "dark", "system"];

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const theme = body?.theme;
  if (!VALID_THEMES.includes(theme)) {
    return NextResponse.json({ error: `theme must be one of ${VALID_THEMES.join(", ")}` }, { status: 400 });
  }

  await query(`UPDATE users SET theme = $2, updated_at = now() WHERE id = $1`, [userId, theme]);
  return NextResponse.json({ ok: true });
}
