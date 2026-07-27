import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { registerMockNgnInflow } from "@/vendors/ngnAccount/mockMonnify";
import { mockDisabledResponse } from "@/lib/security/mockGuard";

// Dev-only stand-in for a real transfer landing on the reserved account and
// Monnify firing its webhook. Disabled once the live Monnify keys are set.
// Registers the vendor-side inflow, then delivers a correctly-signed webhook to
// /api/webhooks/monnify so the production path (verify -> re-fetch -> credit)
// runs end to end.
export async function POST(req: NextRequest) {
  const blocked = mockDisabledResponse();
  if (blocked) return blocked;

  if (process.env.MONNIFY_API_KEY) {
    return NextResponse.json({ error: "mock disabled once Monnify is live" }, { status: 403 });
  }
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const amountMinor = body?.amountMinor;
  const senderName = body?.senderName ?? "Chidi Okafor";
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    return NextResponse.json({ error: "amountMinor must be a positive integer" }, { status: 400 });
  }

  const { rows } = await query<{ provider_ref: string }>(
    `SELECT provider_ref FROM virtual_accounts WHERE user_id = $1 AND currency = 'NGN'`,
    [userId]
  );
  if (!rows[0]) return NextResponse.json({ error: "no Naira account" }, { status: 404 });

  const inflowRef = `mnfy_${crypto.randomUUID()}`;
  registerMockNgnInflow(inflowRef, {
    status: "received",
    accountProviderRef: rows[0].provider_ref,
    amountMinor,
    senderName,
    senderBank: "GTBank (Mock)",
  });

  const payload = JSON.stringify({ eventType: "SUCCESSFUL_TRANSACTION", eventData: { transactionReference: inflowRef } });
  const secret = process.env.MONNIFY_WEBHOOK_SECRET ?? "dev_only_monnify_secret";
  const signature = crypto.createHmac("sha512", secret).update(payload).digest("hex");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const webhookRes = await fetch(`${appUrl}/api/webhooks/monnify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "monnify-signature": signature },
    body: payload,
  });
  return NextResponse.json({ ok: webhookRes.ok, inflowRef });
}
