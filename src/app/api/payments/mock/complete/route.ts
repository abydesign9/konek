import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { mockDisabledResponse } from "@/lib/security/mockGuard";

// Dev-only stand-in for Paystack's checkout completing and firing its
// webhook. Marks the mock "vendor side" as completed, then delivers a
// real, correctly-signed webhook call to /api/webhooks/paystack so the
// production code path is exercised end to end.
export async function POST(req: NextRequest) {
  const blocked = mockDisabledResponse();
  if (blocked) return blocked;

  if (process.env.PAYSTACK_SECRET_KEY && process.env.PAYSTACK_SECRET_KEY !== "sk_test_...") {
    return NextResponse.json({ error: "mock endpoint disabled once a live Paystack key is set" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const reference = body?.reference;
  if (typeof reference !== "string") {
    return NextResponse.json({ error: "reference required" }, { status: 400 });
  }

  const { rows } = await query<{ amount_minor: string; currency: string }>(
    `SELECT amount_minor, currency FROM transactions WHERE id = $1`,
    [reference]
  );
  const txn = rows[0];
  if (!txn) return NextResponse.json({ error: "unknown reference" }, { status: 404 });

  await query(
    `UPDATE transactions SET vendor_response = $2, updated_at = now() WHERE id = $1`,
    [reference, JSON.stringify({ mock_completed: true })]
  );

  const payload = JSON.stringify({
    event: "charge.success",
    data: { reference, amount: Number(txn.amount_minor), currency: txn.currency },
  });
  const secret = process.env.PAYSTACK_SECRET_KEY ?? "sk_test_...";
  const signature = crypto.createHmac("sha512", secret).update(payload).digest("hex");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const webhookRes = await fetch(`${appUrl}/api/webhooks/paystack`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-paystack-signature": signature },
    body: payload,
  });

  return NextResponse.json({ ok: webhookRes.ok });
}
