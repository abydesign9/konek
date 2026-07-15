import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { createMessage, listMessagesForUser } from "@/lib/support/supportService";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rateLimit";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ messages: await listMessagesForUser(userId) });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const subject = body?.subject;
  const message = body?.body;
  if (typeof subject !== "string" || !subject.trim()) {
    return NextResponse.json({ error: "subject is required" }, { status: 400 });
  }
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  try {
    checkRateLimit(`support_create:${userId}`, 5, 60 * 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many requests — try again later" }, { status: 429 });
    }
    throw err;
  }

  const result = await createMessage(userId, subject.trim(), message.trim());
  return NextResponse.json(result);
}
