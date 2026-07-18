import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import {
  DuplicateFaceError,
  KycStepOutOfOrderError,
  submitLiveness,
  VerificationFailedError,
} from "@/lib/kyc/kycService";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const imageRef = typeof body?.imageRef === "string" ? body.imageRef : undefined;

  try {
    await checkRateLimit(`kyc_liveness:${userId}`, 5, 10 * 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many attempts — try again shortly" }, { status: 429 });
    }
    throw err;
  }

  try {
    const status = await submitLiveness(userId, imageRef);
    return NextResponse.json(status);
  } catch (err) {
    if (err instanceof KycStepOutOfOrderError) {
      return NextResponse.json({ error: err.message, code: "kyc_step_out_of_order" }, { status: 409 });
    }
    if (err instanceof DuplicateFaceError) {
      return NextResponse.json({ error: err.message, code: "duplicate_face" }, { status: 409 });
    }
    if (err instanceof VerificationFailedError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
