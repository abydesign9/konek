import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rateLimit";
import {
  createNairaAccount,
  getNairaAccount,
  AlreadyHasAccountError,
  KycTierTooLowError,
} from "@/lib/ngnAccount/ngnAccountService";

// GET: the user's Naira account (or null). POST: provision one (KYC-gated).
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ account: await getNairaAccount(userId) });
}

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    await checkRateLimit(`naira_account:${userId}`, 5, 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
    }
    throw err;
  }

  try {
    const { virtualAccountId } = await createNairaAccount(userId);
    return NextResponse.json({ ok: true, virtualAccountId, account: await getNairaAccount(userId) });
  } catch (err) {
    if (err instanceof KycTierTooLowError) return NextResponse.json({ error: err.message, code: "kyc_required" }, { status: 403 });
    if (err instanceof AlreadyHasAccountError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
}
