import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rateLimit";
import {
  verifyMethod,
  UnknownMethodError,
  NoProviderError,
  MethodVerificationFailedError,
  DuplicateFaceError,
} from "@/lib/kyc/verificationService";

// Generic, country-aware method verification. The client sends a method code
// (bvn, nin, passport, ssn_last4, selfie_liveness, ...) plus its value/ref; the
// service routes to the right provider for the user's country and recomputes
// the tier. This replaces the BVN/NIN-specific endpoint for the global flow
// (the legacy /api/kyc/identity + /liveness routes still work, delegating here).
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const b = await req.json().catch(() => null);
  const method = typeof b?.method === "string" ? b.method : "";
  if (!method) return NextResponse.json({ error: "method is required" }, { status: 400 });

  try {
    // KYC lookups cost money — cap attempts per user.
    await checkRateLimit(`kyc_verify:${userId}`, 8, 10 * 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many attempts — try again shortly" }, { status: 429 });
    }
    throw err;
  }

  try {
    const result = await verifyMethod({
      userId,
      method,
      value: typeof b?.value === "string" ? b.value.trim() : undefined,
      imageRef: typeof b?.imageRef === "string" ? b.imageRef : undefined,
      documentRef: typeof b?.documentRef === "string" ? b.documentRef : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UnknownMethodError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof NoProviderError) return NextResponse.json({ error: err.message, code: "no_provider" }, { status: 409 });
    if (err instanceof DuplicateFaceError) return NextResponse.json({ error: err.message, code: "duplicate_face" }, { status: 409 });
    if (err instanceof MethodVerificationFailedError) return NextResponse.json({ error: err.message }, { status: 422 });
    throw err;
  }
}
