import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { AlreadySpunTodayError, getSpinStatus, spin } from "@/lib/rewards/spin";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rateLimit";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json(await getSpinStatus(userId));
}

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    await checkRateLimit(`spin:${userId}`, 3, 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many attempts — try again shortly" }, { status: 429 });
    }
    throw err;
  }

  try {
    const result = await spin(userId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AlreadySpunTodayError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
