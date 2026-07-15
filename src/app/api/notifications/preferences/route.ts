import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { rows } = await query(
    `INSERT INTO notification_preferences (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING push_enabled, sms_enabled, email_enabled, whatsapp_enabled, price_alerts`,
    [userId]
  );
  return NextResponse.json(rows[0]);
}

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const fields = ["push_enabled", "sms_enabled", "email_enabled", "whatsapp_enabled", "price_alerts"] as const;
  const updates: Record<string, boolean> = {};
  for (const f of fields) {
    if (typeof body?.[f] === "boolean") updates[f] = body[f];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no valid fields" }, { status: 400 });
  }

  const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`);
  await query(
    `INSERT INTO notification_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [userId]
  );
  await query(
    `UPDATE notification_preferences SET ${setClauses.join(", ")} WHERE user_id = $1`,
    [userId, ...Object.values(updates)]
  );
  return NextResponse.json({ ok: true });
}
