import { NextRequest, NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/partners/partnerService";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rateLimit";
import { InsufficientBalanceError, purchaseVtu } from "@/lib/purchases/purchaseVtuService";
import { postJournal } from "@/lib/ledger/postJournal";
import { getOrCreateAccount } from "@/lib/ledger/accounts";
import { LimitExceededError } from "@/lib/limits/checkLimits";
import { NoHealthyVendorError } from "@/vendors/registry";
import { VendorServiceType } from "@/vendors/types";

const SUPPORTED_TYPES: VendorServiceType[] = ["airtime", "data"];

// External API for white-label partners (e.g. an FXBud-style remittance
// app) to trigger purchases for their own end users, billed against the
// partner's business owner wallet. Auth is a bearer-style API key, not a
// raviion user session — this endpoint is meant to be called
// server-to-server, never from a partner's own end-user browser.
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-partner-api-key");
  if (!apiKey) return NextResponse.json({ error: "x-partner-api-key header is required" }, { status: 401 });

  const partner = await authenticatePartner(apiKey);
  if (!partner) return NextResponse.json({ error: "invalid or inactive API key" }, { status: 401 });

  // Per-partner throttle so one key cannot flood vendor purchases.
  try {
    await checkRateLimit(`whitelabel:${partner.id}`, 60, 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });
    }
    throw err;
  }

  const body = await req.json().catch(() => null);
  const { serviceType, network, phone, amountMinor, externalReference } = body ?? {};

  if (!SUPPORTED_TYPES.includes(serviceType)) {
    return NextResponse.json({ error: `serviceType must be one of ${SUPPORTED_TYPES.join(", ")}` }, { status: 400 });
  }
  if (!partner.allowedServices.includes(serviceType)) {
    return NextResponse.json({ error: `this partner is not authorized for ${serviceType}` }, { status: 403 });
  }
  if (typeof network !== "string" || typeof phone !== "string" || phone.length < 6) {
    return NextResponse.json({ error: "network and phone are required" }, { status: 400 });
  }
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    return NextResponse.json({ error: "amountMinor must be a positive integer" }, { status: 400 });
  }
  if (typeof externalReference !== "string" || externalReference.length < 4) {
    return NextResponse.json({ error: "externalReference is required (your own idempotency key)" }, { status: 400 });
  }

  try {
    const result = await purchaseVtu({
      userId: partner.ownerUserId,
      idempotencyKey: `whitelabel:${partner.id}:${externalReference}`,
      serviceType,
      network,
      phone,
      amountMinor,
    });

    if (result.status === "delivered") {
      const revenueShareMinor = Math.round(amountMinor * partner.revenueSharePct);
      if (revenueShareMinor > 0) {
        const expenseAccountId = await getOrCreateAccount("platform", null, "NGN", "expense");
        const partnerFloatAccountId = await getOrCreateAccount("user", partner.ownerUserId, "NGN", "partner_float");
        await postJournal({
          txnId: result.txnId,
          description: `White-label revenue share for partner ${partner.id}`,
          entries: [
            { accountId: expenseAccountId, amountMinor: -revenueShareMinor, currency: "NGN" },
            { accountId: partnerFloatAccountId, amountMinor: revenueShareMinor, currency: "NGN" },
          ],
        });
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    if (err instanceof NoHealthyVendorError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    if (err instanceof LimitExceededError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    throw err;
  }
}
