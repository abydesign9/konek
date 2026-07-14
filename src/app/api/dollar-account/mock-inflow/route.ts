import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { registerMockInflow } from "@/vendors/dollarAccount/mockFincra";

// Dev-only stand-in for a real wire landing on the account and Fincra
// firing its webhook. Registers the "vendor-side" inflow under its own
// reference (distinct from the account's providerRef — an account can
// receive many inflows), then delivers a real, correctly-signed webhook
// call to /api/webhooks/dollar-account so the production code path
// (signature verify -> re-fetch -> credit) is exercised end to end, same
// as the mock Paystack checkout.
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const amountMinor = body?.amountMinor;
  const senderName = body?.senderName ?? "Jane Diaspora";
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    return NextResponse.json({ error: "amountMinor must be a positive integer" }, { status: 400 });
  }

  const { rows } = await query<{ provider_ref: string }>(
    `SELECT provider_ref FROM virtual_accounts WHERE user_id = $1`,
    [userId]
  );
  if (!rows[0]) return NextResponse.json({ error: "no dollar account" }, { status: 404 });

  const accountProviderRef = rows[0].provider_ref;
  const inflowRef = `inflow_${crypto.randomUUID()}`;
  registerMockInflow(inflowRef, {
    status: "received",
    accountProviderRef,
    amountMinor,
    currency: "USD",
    senderName,
    senderBank: "Chase Bank (Mock)",
  });

  const payload = JSON.stringify({ event: "inflow.received", data: { inflowRef } });
  const secret = process.env.FINCRA_WEBHOOK_SECRET ?? "dev_only_fincra_secret";
  const signature = crypto.createHmac("sha512", secret).update(payload).digest("hex");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const webhookRes = await fetch(`${appUrl}/api/webhooks/dollar-account`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-fincra-signature": signature },
    body: payload,
  });

  return NextResponse.json({ ok: webhookRes.ok });
}
