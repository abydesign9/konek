import { NextRequest, NextResponse } from "next/server";
import { receiveWebhook } from "@/lib/webhooks/webhookFramework";
import { kycHandler } from "@/lib/webhooks/registerHandlers";

// Async KYC provider callbacks (Sumsub, Smile ID, Onfido...). Same hardened
// transport as every other webhook: constant-time signature check, persist
// before process, idempotent replay. Provider specifics (header + secret) live
// here; the decision is applied by kycHandler.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-kyc-signature");

  const { status } = await receiveWebhook({
    vendor: "kyc",
    rawBody,
    signature,
    secret: process.env.KYC_WEBHOOK_SECRET,
    algo: "sha256",
    headers: signature ? { "x-kyc-signature": signature } : undefined,
    extract: (p) => ({
      eventType: typeof p.event === "string" ? p.event : null,
      reference:
        typeof (p.data as { reference?: unknown } | undefined)?.reference === "string"
          ? (p.data as { reference: string }).reference
          : null,
    }),
    handler: kycHandler,
  });

  if (status === "rejected") {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  return NextResponse.json({ received: true });
}
