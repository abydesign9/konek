import { NextRequest, NextResponse } from "next/server";
import { receiveWebhook } from "@/lib/webhooks/webhookFramework";
import { monnifyHandler } from "@/lib/webhooks/registerHandlers";

// Monnify reserved-account inflow callback. Same hardened transport as every
// other webhook: constant-time signature check (SHA-512 HMAC over the raw body
// with MONNIFY_WEBHOOK_SECRET), persist before process, idempotent replay.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("monnify-signature");

  const { status } = await receiveWebhook({
    vendor: "monnify",
    rawBody,
    signature,
    secret: process.env.MONNIFY_WEBHOOK_SECRET,
    algo: "sha512",
    headers: signature ? { "monnify-signature": signature } : undefined,
    extract: (p) => ({
      eventType: typeof p.eventType === "string" ? p.eventType : null,
      reference:
        typeof (p.eventData as { transactionReference?: unknown } | undefined)?.transactionReference === "string"
          ? (p.eventData as { transactionReference: string }).transactionReference
          : null,
    }),
    handler: monnifyHandler,
  });

  if (status === "rejected") {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  return NextResponse.json({ received: true });
}
