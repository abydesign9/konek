import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { withIdempotency } from "@/lib/idempotency";
import { assertKycTier, KYC_TIER, KycGateError } from "@/lib/kyc/tiers";
import { paymentGateway } from "@/lib/payments";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rateLimit";

const CURRENCY = "NGN";
const MIN_AMOUNT_MINOR = 10000; // ₦100

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Each funding attempt initializes a Paystack charge (a paid vendor call).
  // Cap attempts per user so the endpoint can't be hammered into runaway
  // gateway calls or a flood of pending transactions.
  try {
    await checkRateLimit(`wallet_fund:${userId}`, 10, 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
    }
    throw err;
  }

  const body = await req.json().catch(() => null);
  const amountMinor = body?.amountMinor;
  const idempotencyKey = body?.idempotencyKey;

  if (!Number.isInteger(amountMinor) || amountMinor < MIN_AMOUNT_MINOR) {
    return NextResponse.json({ error: `amountMinor must be an integer >= ${MIN_AMOUNT_MINOR}` }, { status: 400 });
  }
  if (typeof idempotencyKey !== "string" || idempotencyKey.length < 8) {
    return NextResponse.json({ error: "idempotencyKey is required" }, { status: 400 });
  }

  // Tier 1 (BVN/NIN) is the gate for any money movement — you cannot fund a
  // wallet while only browse-tier. Everything downstream (VTU, eSIM) needs a
  // funded wallet, so this is the single choke point for the transact tier.
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

  const { rows: userRows } = await query<{ phone: string | null; email: string | null }>(
    `SELECT phone, email FROM users WHERE id = $1`,
    [userId]
  );
  const user = userRows[0];
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });
  // Every account has one or the other now (email required at signup;
  // phone-only accounts predate this and still have a phone).
  const gatewayEmail = user.email ?? (user.phone ? `${user.phone.replace("+", "")}@raviion.app` : `${userId}@raviion.app`);

  const result = await withIdempotency(
    `wallet_fund:${userId}:${idempotencyKey}`,
    { userId, amountMinor, currency: CURRENCY },
    async () => {
      const txn = await query<{ id: string }>(
        `INSERT INTO transactions (user_id, idempotency_key, type, status, currency, amount_minor)
         VALUES ($1, $2, 'fund_wallet', 'initiated', $3, $4)
         RETURNING id`,
        [userId, idempotencyKey, CURRENCY, amountMinor]
      );
      const txnId = txn.rows[0].id;

      // Derive the callback origin from the incoming request so it works on any
      // deployment without relying on NEXT_PUBLIC_APP_URL being set (which is
      // why funding was bouncing users to localhost in production).
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
      const { authorizationUrl, reference } = await paymentGateway.initialize({
        email: gatewayEmail,
        amountMinor,
        currency: CURRENCY,
        reference: txnId,
        callbackUrl: `${appUrl}/wallet/fund/success?reference=${txnId}`,
      });

      await query(
        `UPDATE transactions SET vendor = 'paystack', vendor_ref = $2, status = 'pending_vendor', updated_at = now() WHERE id = $1`,
        [txnId, reference]
      );
      await query(
        `INSERT INTO transaction_events (txn_id, from_status, to_status, detail) VALUES ($1, 'initiated', 'pending_vendor', $2)`,
        [txnId, JSON.stringify({ reference })]
      );

      return { txnId, authorizationUrl };
    }
  );

  return NextResponse.json(result);
}
