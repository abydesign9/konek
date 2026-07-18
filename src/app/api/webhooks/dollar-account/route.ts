import { NextRequest, NextResponse } from "next/server";
import { receiveWebhook } from "@/lib/webhooks/webhookFramework";
import { fincraHandler } from "@/lib/webhooks/registerHandlers";

// Thin transport adapter over the generic webhook framework (constant-time
// signature check, persist-before-process, reject-before-parse, idempotent
// processing + replay). Only the Fincra transport specifics live here.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-fincra-signature");

  const { status } = await receiveWebhook({
    vendor: "mock_fincra",
    rawBody,
    signature,
    secret: process.env.FINCRA_WEBHOOK_SECRET,
    algo: "sha512",
    headers: signature ? { "x-fincra-signature": signature } : undefined,
    extract: (p) => ({
      eventType: typeof p.event === "string" ? p.event : null,
      reference:
        typeof (p.data as { inflowRef?: unknown } | undefined)?.inflowRef === "string"
          ? (p.data as { inflowRef: string }).inflowRef
          : null,
    }),
    handler: fincraHandler,
  });

  if (status === "rejected") {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  return NextResponse.json({ received: true });
}
