import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { addUserReply, NotFoundError } from "@/lib/support/supportService";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rateLimit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const message = body?.body;
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  try {
    await checkRateLimit(`support_reply:${userId}`, 20, 60 * 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many replies — try again later" }, { status: 429 });
    }
    throw err;
  }

  try {
    await addUserReply(params.id, userId, message.trim());
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
