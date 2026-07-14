import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { submitIdentity, VerificationFailedError } from "@/lib/kyc/kycService";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const type = body?.type;
  const value = body?.value;

  if (type !== "bvn" && type !== "nin") {
    return NextResponse.json({ error: "type must be 'bvn' or 'nin'" }, { status: 400 });
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    return NextResponse.json({ error: `${type.toUpperCase()} is required` }, { status: 400 });
  }

  try {
    // KYC calls cost money per lookup — cap attempts so a typo storm can't
    // rack up vendor spend.
    checkRateLimit(`kyc_identity:${userId}`, 5, 10 * 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many attempts — try again shortly" }, { status: 429 });
    }
    throw err;
  }

  try {
    const status = await submitIdentity(userId, type, value.trim());
    return NextResponse.json(status);
  } catch (err) {
    if (err instanceof VerificationFailedError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
