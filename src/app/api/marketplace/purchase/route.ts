import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { IncorrectPinError, PinLockedError, PinNotSetError, verifyPin } from "@/lib/auth/pin";
import { assertKycTier, KYC_TIER, KycGateError } from "@/lib/kyc/tiers";
import { LimitExceededError } from "@/lib/limits/checkLimits";
import { IdempotencyInProgressError } from "@/lib/idempotency";
import { InsufficientBalanceError } from "@/lib/ledger/reservations";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rateLimit";
import { marketplacePurchase, ProductNotFoundError, NoSupplierError } from "@/lib/marketplace/purchase";

// Buy a marketplace product. PIN-gated like every other spend; supplier selection
// + failover happen entirely inside marketplacePurchase.
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    await checkRateLimit(`mktpurchase:${userId}`, 10, 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) return NextResponse.json({ error: "Too many attempts — slow down" }, { status: 429 });
    throw err;
  }

  // eSIM needs the transact tier (same as the rest of the eSIM path).
  try {
    await assertKycTier(userId, KYC_TIER.TRANSACT);
  } catch (err) {
    if (err instanceof KycGateError) {
      return NextResponse.json({ error: err.message, code: err.code, requiredTier: err.requiredTier }, { status: 403 });
    }
    throw err;
  }

  const b = await req.json().catch(() => null);
  const { catalogProductId, idempotencyKey, pin } = b ?? {};
  if (typeof catalogProductId !== "string" || !catalogProductId) {
    return NextResponse.json({ error: "catalogProductId is required" }, { status: 400 });
  }
  if (typeof idempotencyKey !== "string" || idempotencyKey.length < 8) {
    return NextResponse.json({ error: "idempotencyKey is required" }, { status: 400 });
  }
  if (typeof pin !== "string") return NextResponse.json({ error: "pin is required" }, { status: 400 });

  try {
    await verifyPin(userId, pin);
  } catch (err) {
    if (err instanceof PinNotSetError) return NextResponse.json({ error: err.message, code: "pin_not_set" }, { status: 428 });
    if (err instanceof IncorrectPinError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof PinLockedError) {
      return NextResponse.json({ error: err.message, code: "pin_locked", lockedUntil: err.until.toISOString() }, { status: 423 });
    }
    throw err;
  }

  try {
    const result = await marketplacePurchase({ userId, catalogProductId, idempotencyKey });
    // Never leak the fulfilling supplier to the customer.
    return NextResponse.json({ txnId: result.txnId, status: result.status });
  } catch (err) {
    if (err instanceof ProductNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    if (err instanceof NoSupplierError) return NextResponse.json({ error: err.message }, { status: 409 });
    if (err instanceof InsufficientBalanceError) return NextResponse.json({ error: err.message }, { status: 402 });
    if (err instanceof LimitExceededError) return NextResponse.json({ error: err.message }, { status: 429 });
    if (err instanceof IdempotencyInProgressError) {
      return NextResponse.json({ error: "This purchase is already being processed", code: "in_progress" }, { status: 409 });
    }
    throw err;
  }
}
