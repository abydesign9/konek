import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";

// en (English), fr (French — francophone-neighbor diaspora), pcm (Nigerian
// Pidgin). Selection persists for real; app copy itself is still English
// only — the same "config layer ahead of the full feature" honesty as
// everything else deferred in this codebase.
const VALID_LANGUAGES = ["en", "fr", "pcm"];

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const language = body?.language;
  if (!VALID_LANGUAGES.includes(language)) {
    return NextResponse.json({ error: `language must be one of ${VALID_LANGUAGES.join(", ")}` }, { status: 400 });
  }

  await query(`UPDATE users SET language = $2, updated_at = now() WHERE id = $1`, [userId, language]);
  return NextResponse.json({ ok: true });
}
