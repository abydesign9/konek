import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { IncorrectPinError, PinNotSetError, verifyPin } from "@/lib/auth/pin";
import { query } from "@/lib/db";
import { usdMinorToNgnMinor } from "@/lib/fx";
import { assertKycTier, KYC_TIER, KycGateError } from "@/lib/kyc/tiers";
import { LimitExceededError } from "@/lib/limits/checkLimits";
import { InsufficientBalanceError, purchaseVtu } from "@/lib/purchases/purchaseVtuService";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rateLimit";
import { NoHealthyVendorError } from "@/vendors/registry";
import { VendorServiceType } from "@/vendors/types";

const CATALOG_SERVICE_TYPES: VendorServiceType[] = ["data", "cable", "exam_pin", "esim"];
const NGN_AMOUNT_SERVICE_TYPES: VendorServiceType[] = ["airtime", "electricity"];
const INTL_TOPUP_PRESETS_USD_MINOR = [500, 1000, 2000, 5000]; // $5 / $10 / $20 / $50
const SUPPORTED_TYPES = [...CATALOG_SERVICE_TYPES, ...NGN_AMOUNT_SERVICE_TYPES, "intl_topup" as const];

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    checkRateLimit(`purchase:${userId}`, 10, 60 * 1000); // 10 purchase attempts per minute per user
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many purchase attempts — slow down" }, { status: 429 });
    }
    throw err;
  }

  // Local VTU, intl top-up and eSIM all require the transact tier (BVN/NIN).
  try {
    await assertKycTier(userId, KYC_TIER.TRANSACT);
  } catch (err) {
    if (err instanceof KycGateError) {
      return NextResponse.json(
        { error: err.message, code: err.code, requiredTier: err.requiredTier },
        { status: 403 }
      );
    }
    throw err;
  }

  const body = await req.json().catch(() => null);
  const { serviceType, network, phone, amountMinor, planExternalId, idempotencyKey, pin } = body ?? {};

  if (!SUPPORTED_TYPES.includes(serviceType)) {
    return NextResponse.json({ error: `serviceType must be one of ${SUPPORTED_TYPES.join(", ")}` }, { status: 400 });
  }
  if (typeof network !== "string" || !network) {
    return NextResponse.json({ error: "network is required" }, { status: 400 });
  }
  const requiresSubscriberId = serviceType !== "exam_pin" && serviceType !== "esim";
  if (typeof phone !== "string" || (requiresSubscriberId && phone.length < 6)) {
    return NextResponse.json({ error: "a valid phone/meter/smartcard number is required" }, { status: 400 });
  }
  if (typeof idempotencyKey !== "string" || idempotencyKey.length < 8) {
    return NextResponse.json({ error: "idempotencyKey is required" }, { status: 400 });
  }
  if (typeof pin !== "string") {
    return NextResponse.json({ error: "pin is required" }, { status: 400 });
  }

  // The actual amount charged is always resolved server-side — never taken
  // verbatim from the client — so a tampered request can't buy an
  // expensive plan for less, or misreport a USD->NGN conversion.
  let chargeAmountMinor: number;
  let recipientExtra: Record<string, unknown> | undefined;

  if (CATALOG_SERVICE_TYPES.includes(serviceType)) {
    if (typeof planExternalId !== "string") {
      return NextResponse.json({ error: "planExternalId is required for this service" }, { status: 400 });
    }
    const { rows } = await query<{ price_minor: string; currency: string }>(
      `SELECT price_minor, currency FROM catalog_items WHERE service_type = $1 AND external_id = $2 AND active = true`,
      [serviceType, planExternalId]
    );
    if (!rows[0]) {
      return NextResponse.json({ error: "unknown or inactive plan" }, { status: 400 });
    }
    const priceMinor = Number(rows[0].price_minor);
    if (rows[0].currency === "USD") {
      chargeAmountMinor = usdMinorToNgnMinor(priceMinor);
      recipientExtra = { displayCurrency: "USD", displayAmountMinor: priceMinor };
    } else {
      chargeAmountMinor = priceMinor;
    }
  } else if (serviceType === "intl_topup") {
    if (!INTL_TOPUP_PRESETS_USD_MINOR.includes(amountMinor)) {
      return NextResponse.json(
        { error: `amountMinor (USD cents) must be one of ${INTL_TOPUP_PRESETS_USD_MINOR.join(", ")}` },
        { status: 400 }
      );
    }
    chargeAmountMinor = usdMinorToNgnMinor(amountMinor);
    recipientExtra = { displayCurrency: "USD", displayAmountMinor: amountMinor };
  } else {
    if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
      return NextResponse.json({ error: "amountMinor must be a positive integer" }, { status: 400 });
    }
    chargeAmountMinor = amountMinor;
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
    throw err;
  }

  try {
    const result = await purchaseVtu({
      userId,
      idempotencyKey,
      serviceType,
      network,
      phone,
      amountMinor: chargeAmountMinor,
      planExternalId,
      recipientExtra,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    if (err instanceof NoHealthyVendorError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    if (err instanceof LimitExceededError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    throw err;
  }
}
