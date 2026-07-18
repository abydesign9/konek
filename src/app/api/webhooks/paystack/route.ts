import { NextRequest, NextResponse } from "next/server";
import { receiveWebhook } from "@/lib/webhooks/webhookFramework";
import { paystackHandler } from "@/lib/webhooks/registerHandlers";

// Thin transport adapter over the generic webhook framework. All the invariants
// (constant-time signature check, persist-before-process, reject-before-parse,
// idempotent processing, verify-never-trust) live in the framework — this route
// only supplies Paystack's transport specifics (header, secret, algo, extract).
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  const { status } = await receiveWebhook({
    vendor: "paystack",
    rawBody,
    signature,
    secret: process.env.PAYSTACK_SECRET_KEY,
    algo: "sha512",
    headers: signature ? { "x-paystack-signature": signature } : undefined,
    extract: (p) => ({
      eventType: typeof p.event === "string" ? p.event : null,
      reference:
        typeof (p.data as { reference?: unknown } | undefined)?.reference === "string"
          ? (p.data as { reference: string }).reference
          : null,
    }),
    handler: paystackHandler,
  });

  if (status === "rejected") {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  // 200 even when processing failed: the event is persisted and will be replayed
  // by the cron worker, so Paystack shouldn't hammer retries for our-side bugs.
  return NextResponse.json({ received: true });
}
