import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { withIdempotency } from "@/lib/idempotency";
import { paymentGateway } from "@/lib/payments";

const CURRENCY = "NGN";
const MIN_AMOUNT_MINOR = 10000; // ₦100

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const amountMinor = body?.amountMinor;
  const idempotencyKey = body?.idempotencyKey;

  if (!Number.isInteger(amountMinor) || amountMinor < MIN_AMOUNT_MINOR) {
    return NextResponse.json({ error: `amountMinor must be an integer >= ${MIN_AMOUNT_MINOR}` }, { status: 400 });
  }
  if (typeof idempotencyKey !== "string" || idempotencyKey.length < 8) {
    return NextResponse.json({ error: "idempotencyKey is required" }, { status: 400 });
  }

  const { rows: userRows } = await query<{ phone: string; email: string | null }>(
    `SELECT phone, email FROM users WHERE id = $1`,
    [userId]
  );
  const user = userRows[0];
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

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

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const { authorizationUrl, reference } = await paymentGateway.initialize({
        email: user.email ?? `${user.phone.replace("+", "")}@konek.app`,
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
