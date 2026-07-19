import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { IncorrectPinError, PinLockedError, PinNotSetError, verifyPin } from "@/lib/auth/pin";
import { assertKycTier, KYC_TIER, KycGateError } from "@/lib/kyc/tiers";
import { LimitExceededError } from "@/lib/limits/checkLimits";
import { IdempotencyInProgressError } from "@/lib/idempotency";
import { InsufficientBalanceError } from "@/lib/ledger/reservations";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rateLimit";
import { BankAccountNotFoundError, requestWithdrawal } from "@/lib/withdrawals/withdrawService";

const MIN_WITHDRAW_MINOR = 10000; // ₦100

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    await checkRateLimit(`withdraw:${userId}`, 5, 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many attempts — slow down" }, { status: 429 });
    }
    throw err;
  }

  // Cashing out requires the finance tier (same as USD accounts / cards).
  try {
    await assertKycTier(userId, KYC_TIER.FINANCE);
  } catch (err) {
    if (err instanceof KycGateError) {
      return NextResponse.json({ error: err.message, code: err.code, requiredTier: err.requiredTier }, { status: 403 });
    }
    throw err;
  }

  const body = await req.json().catch(() => null);
  const { bankAccountId, amountMinor, idempotencyKey, pin } = body ?? {};

  if (typeof bankAccountId !== "string" || !bankAccountId) {
    return NextResponse.json({ error: "bankAccountId is required" }, { status: 400 });
  }
  if (!Number.isInteger(amountMinor) || amountMinor < MIN_WITHDRAW_MINOR) {
    return NextResponse.json({ error: `Minimum withdrawal is ₦${MIN_WITHDRAW_MINOR / 100}` }, { status: 400 });
  }
  if (typeof idempotencyKey !== "string" || idempotencyKey.length < 8) {
    return NextResponse.json({ error: "idempotencyKey is required" }, { status: 400 });
  }
  if (typeof pin !== "string") {
    return NextResponse.json({ error: "pin is required" }, { status: 400 });
  }

  try {
    await verifyPin(userId, pin);
  } catch (err) {
    if (err instanceof PinNotSetError) {
      return NextResponse.json({ error: err.message, code: "pin_not_set" }, { status: 428 });
    }
    if (err instanceof IncorrectPinError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof PinLockedError) {
      return NextResponse.json({ error: err.message, code: "pin_locked", lockedUntil: err.until.toISOString() }, { status: 423 });
    }
    throw err;
  }

  try {
    const result = await requestWithdrawal({ userId, idempotencyKey, bankAccountId, amountMinor });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof BankAccountNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    if (err instanceof LimitExceededError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (err instanceof IdempotencyInProgressError) {
      return NextResponse.json({ error: "This withdrawal is already being processed", code: "in_progress" }, { status: 409 });
    }
    throw err;
  }
}
