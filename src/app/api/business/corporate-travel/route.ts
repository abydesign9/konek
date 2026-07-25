import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { purchaseVtu, InsufficientBalanceError } from "@/lib/purchases/purchaseVtuService";
import { NoHealthyVendorError } from "@/vendors/registry";
import { usdMinorToNgnMinor } from "@/lib/fx";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rateLimit";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { rows: biz } = await query<{ id: string }>(`SELECT id FROM business_accounts WHERE owner_user_id = $1`, [userId]);
  if (!biz[0]) return NextResponse.json({ orders: [] });

  const { rows } = await query(
    `SELECT id, traveler_name, traveler_email, destination_country, txn_id, created_at
     FROM corporate_travel_orders WHERE business_account_id = $1 ORDER BY created_at DESC`,
    [biz[0].id]
  );
  return NextResponse.json({ orders: rows });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    await checkRateLimit(`corp_travel:${userId}`, 20, 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
    }
    throw err;
  }

  const { rows: biz } = await query<{ id: string; kyb_status: string }>(
    `SELECT id, kyb_status FROM business_accounts WHERE owner_user_id = $1`,
    [userId]
  );
  if (!biz[0]) return NextResponse.json({ error: "no business account — apply first" }, { status: 404 });
  if (biz[0].kyb_status !== "verified") {
    return NextResponse.json({ error: "business must be KYB-verified" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const { travelerName, travelerEmail, planExternalId, country, idempotencyKey } = body ?? {};
  if (typeof travelerName !== "string" || typeof planExternalId !== "string" || typeof country !== "string") {
    return NextResponse.json({ error: "travelerName, planExternalId, and country are required" }, { status: 400 });
  }
  if (typeof idempotencyKey !== "string" || idempotencyKey.length < 8) {
    return NextResponse.json({ error: "idempotencyKey is required" }, { status: 400 });
  }

  const { rows: catalogRows } = await query<{ id: string; price_minor: string; currency: string }>(
    `SELECT id, price_minor, currency FROM catalog_items WHERE service_type = 'esim' AND external_id = $1 AND active = true`,
    [planExternalId]
  );
  const plan = catalogRows[0];
  if (!plan) return NextResponse.json({ error: "unknown eSIM plan" }, { status: 400 });

  // Server-side pricing at the live rate — never a hardcoded FX constant.
  const amountMinor =
    plan.currency === "USD" ? await usdMinorToNgnMinor(Number(plan.price_minor)) : Number(plan.price_minor);

  try {
    const result = await purchaseVtu({
      userId,
      // Client-supplied so a retry replays the original purchase instead of
      // double-charging (Date.now() here previously defeated idempotency).
      idempotencyKey: `corp_travel:${biz[0].id}:${idempotencyKey}`,
      serviceType: "esim",
      network: country,
      phone: "na",
      amountMinor,
      planExternalId,
      recipientExtra: { displayCurrency: plan.currency === "USD" ? "USD" : undefined, displayAmountMinor: plan.currency === "USD" ? Number(plan.price_minor) : undefined },
    });

    const { rows: orderRows } = await query<{ id: string }>(
      `INSERT INTO corporate_travel_orders (business_account_id, traveler_name, traveler_email, destination_country, catalog_item_id, txn_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [biz[0].id, travelerName, travelerEmail ?? null, country, plan.id, result.txnId]
    );

    return NextResponse.json({ orderId: orderRows[0].id, ...result });
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    if (err instanceof NoHealthyVendorError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    throw err;
  }
}
