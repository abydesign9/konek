import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";

// Remove a device's push subscription (user turned notifications off, or the
// browser rotated the endpoint).
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const b = await req.json().catch(() => null);
  const endpoint = b?.endpoint;
  if (typeof endpoint !== "string") return NextResponse.json({ error: "endpoint required" }, { status: 400 });

  await query(`DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2`, [endpoint, userId]);
  return NextResponse.json({ ok: true });
}
