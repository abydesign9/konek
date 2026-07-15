import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { createMessage, listMessagesForUser, type SupportPriority } from "@/lib/support/supportService";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rateLimit";

const VALID_CATEGORIES = ["kyc", "payments", "vtu", "esim", "card", "dollar_account", "other"];

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
  const category = VALID_CATEGORIES.includes(body?.category) ? body.category : undefined;
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

  // Priority always starts at 'medium' from the customer side — only an
  // admin can escalate/de-escalate, so a customer can't self-assign 'urgent'.
  const result = await createMessage(userId, subject.trim(), message.trim(), category, "medium" as SupportPriority);
  return NextResponse.json(result);
}
