import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiRequest } from "@/lib/business/apiKeyService";
import { BusinessNotVerifiedError, createBulkBatch, processBulkBatch } from "@/lib/bulk/bulkBatchService";
import { query } from "@/lib/db";
import { checkRateLimit, clientIp, RateLimitExceededError } from "@/lib/rateLimit";
import { withIdempotency, IdempotencyConflictError, IdempotencyInProgressError } from "@/lib/idempotency";

const VALID_SERVICE_TYPES = ["airtime", "data"];
const VALID_NETWORKS = ["mtn", "glo", "airtel", "9mobile"];

// Public API v1: trigger a distribution programmatically, authenticated with a
// business API key (Authorization: Bearer knk_live_... or knk_sandbox_...)
// instead of a session cookie. Every call is logged to business_api_requests
// so the business can see its own API activity in the hub.
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const rawKey = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!rawKey) {
    return NextResponse.json({ error: "Missing Authorization: Bearer <api key>" }, { status: 401 });
  }

  // Throttle failed-key attempts by IP before we even know which account this
  // is — the key itself has 192 bits of entropy so brute force is already
  // infeasible, but this is a cheap defense-in-depth layer plus a signal for
  // credential-stuffing activity, matching the same pattern login/OTP use.
  try {
    await checkRateLimit(`business_api_auth:${clientIp(req)}`, 20, 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
    }
    throw err;
  }

  const apiKey = await authenticateApiKey(rawKey);
  if (!apiKey) {
    return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 });
  }

  try {
    await checkRateLimit(`business_api:${apiKey.id}`, 30, 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      await logApiRequest(apiKey.id, "POST", "/api/v1/business/distributions", 429);
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
    throw err;
  }

  const body = await req.json().catch(() => null);
  const { purpose, items } = body ?? {};

  if (typeof purpose !== "string" || !purpose.trim()) {
    await logApiRequest(apiKey.id, "POST", "/api/v1/business/distributions", 400, { error: "purpose required" });
    return NextResponse.json({ error: "purpose is required" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 500) {
    await logApiRequest(apiKey.id, "POST", "/api/v1/business/distributions", 400, { error: "invalid items" });
    return NextResponse.json({ error: "items must be a non-empty array (max 500)" }, { status: 400 });
  }
  for (const item of items) {
    if (
      !VALID_SERVICE_TYPES.includes(item.serviceType) ||
      !VALID_NETWORKS.includes(item.network) ||
      typeof item.phone !== "string" ||
      item.phone.length < 10 ||
      !Number.isInteger(item.amountMinor) ||
      item.amountMinor <= 0
    ) {
      await logApiRequest(apiKey.id, "POST", "/api/v1/business/distributions", 400, { error: "invalid item" });
      return NextResponse.json({ error: "each item needs valid serviceType, network, phone, amountMinor" }, { status: 400 });
    }
  }

  // Sandbox keys never touch real money — validated, but not processed.
  if (apiKey.mode === "sandbox") {
    await logApiRequest(apiKey.id, "POST", "/api/v1/business/distributions", 200, { sandbox: true, itemCount: items.length });
    return NextResponse.json({
      sandbox: true,
      accepted: items.length,
      message: "Sandbox key — request validated but not processed. Use a live key to actually send.",
    });
  }

  // Required for live keys: this processes up to 500 vendor spend calls
  // synchronously, so a client-side timeout-and-retry is very plausible —
  // without a stable key here, a retry would create a second batch and
  // re-send (and re-charge) the entire distribution.
  const idempotencyKey = req.headers.get("idempotency-key");
  if (!idempotencyKey) {
    await logApiRequest(apiKey.id, "POST", "/api/v1/business/distributions", 400, { error: "missing Idempotency-Key header" });
    return NextResponse.json({ error: "Idempotency-Key header is required for live requests" }, { status: 400 });
  }

  try {
    const result = await withIdempotency(
      `business_api_distribution:${apiKey.id}:${idempotencyKey}`,
      { purpose, items },
      async () => {
        const { rows } = await query<{ owner_user_id: string }>(
          `SELECT owner_user_id FROM business_accounts WHERE id = $1`,
          [apiKey.businessAccountId]
        );
        const { batchId } = await createBulkBatch(apiKey.businessAccountId, rows[0].owner_user_id, purpose, items);
        const outcome = await processBulkBatch(batchId);
        return { batchId, ...outcome };
      }
    );
    await logApiRequest(apiKey.id, "POST", "/api/v1/business/distributions", 200, result);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof BusinessNotVerifiedError) {
      await logApiRequest(apiKey.id, "POST", "/api/v1/business/distributions", 403, { error: err.message });
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof IdempotencyConflictError) {
      await logApiRequest(apiKey.id, "POST", "/api/v1/business/distributions", 409, { error: err.message });
      return NextResponse.json({ error: "This Idempotency-Key was already used with a different request body" }, { status: 409 });
    }
    if (err instanceof IdempotencyInProgressError) {
      await logApiRequest(apiKey.id, "POST", "/api/v1/business/distributions", 409, { error: err.message });
      return NextResponse.json({ error: "A request with this Idempotency-Key is still processing" }, { status: 409 });
    }
    await logApiRequest(apiKey.id, "POST", "/api/v1/business/distributions", 500, { error: "internal error" });
    throw err;
  }
}
