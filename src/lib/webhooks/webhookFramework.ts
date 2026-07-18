import crypto from "node:crypto";
import { query } from "@/lib/db";
import { withIdempotency } from "@/lib/idempotency";
import { logAudit } from "@/lib/audit";

// ============================================================================
// Provider-agnostic webhook framework.
//
// Flow (order matters, per the invariants):
//   1. Verify the HMAC signature over the RAW body with a constant-time compare.
//   2. Persist the raw event to webhook_events BEFORE any processing.
//   3. Reject invalid signatures without parsing the payload.
//   4. Process asynchronously, wrapped in idempotency, keyed on the reference.
//   5. The handler must call the provider's verify() and re-fetch authoritative
//      state — the webhook payload's amount/status is never trusted.
//   6. Failed events are retryable/replayable from the database.
//
// Adding a provider = register a verifier + handler; no purchase/business logic
// changes.
// ============================================================================

export type HmacAlgo = "sha256" | "sha512";

// Constant-time HMAC verification over the raw request body.
export function verifyHmacSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string | undefined,
  algo: HmacAlgo = "sha512"
): boolean {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac(algo, secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface WebhookContext {
  eventId: string;
  vendor: string;
  eventType: string | null;
  reference: string | null;
  payload: unknown;
}

// A provider handler mutates state based on the (verified) event. It MUST call
// the provider's verify() endpoint before changing any transaction — it must
// never trust the webhook payload's amounts or status.
export type WebhookHandler = (ctx: WebhookContext) => Promise<unknown>;

const handlers = new Map<string, WebhookHandler>();
export function registerWebhookHandler(vendor: string, handler: WebhookHandler): void {
  handlers.set(vendor, handler);
}
export function getWebhookHandler(vendor: string): WebhookHandler | undefined {
  return handlers.get(vendor);
}

export interface ReceiveResult {
  eventId: string;
  status: "processed" | "failed" | "rejected";
}

export interface ReceiveOptions {
  vendor: string;
  rawBody: string;
  signature: string | null | undefined;
  secret: string | undefined;
  algo?: HmacAlgo;
  headers?: Record<string, string>;
  // Provider-specific extraction of event type + reference from the parsed body.
  extract: (payload: Record<string, unknown>) => { eventType: string | null; reference: string | null };
  handler: WebhookHandler;
}

async function persist(
  vendor: string,
  signatureValid: boolean,
  raw: unknown,
  headers: Record<string, string> | undefined,
  eventType: string | null,
  reference: string | null
): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO webhook_events (vendor, signature_valid, raw, headers, event_type, reference, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'received') RETURNING id`,
    [vendor, signatureValid, JSON.stringify(raw), headers ? JSON.stringify(headers) : null, eventType, reference]
  );
  return rows[0].id;
}

// Verify → persist → (if valid) process. Returns a status the route maps to HTTP.
export async function receiveWebhook(opts: ReceiveOptions): Promise<ReceiveResult> {
  const signatureValid = verifyHmacSignature(opts.rawBody, opts.signature, opts.secret, opts.algo ?? "sha512");

  // Invalid signature: persist the raw bytes (never parsed/trusted) and reject.
  if (!signatureValid) {
    const eventId = await persist(opts.vendor, false, { _rawBody: opts.rawBody }, opts.headers, null, null);
    await query(
      `UPDATE webhook_events SET status = 'rejected', processed = true, processed_at = now(), error = 'invalid signature' WHERE id = $1`,
      [eventId]
    );
    await logAudit("system:webhook", "webhook_rejected", "webhook_event", eventId, { vendor: opts.vendor });
    return { eventId, status: "rejected" };
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(opts.rawBody || "{}");
  } catch {
    payload = {};
  }
  const { eventType, reference } = opts.extract(payload);

  const eventId = await persist(opts.vendor, true, payload, opts.headers, eventType, reference);
  return processStoredEvent(eventId, opts.vendor, eventType, reference, payload, opts.handler);
}

// Runs the handler under idempotency + records the outcome. Shared by the live
// path and the replay worker so behaviour is identical.
async function processStoredEvent(
  eventId: string,
  vendor: string,
  eventType: string | null,
  reference: string | null,
  payload: unknown,
  handler: WebhookHandler
): Promise<ReceiveResult> {
  await query(`UPDATE webhook_events SET status = 'processing' WHERE id = $1`, [eventId]);

  // Idempotency keyed on the provider reference so duplicate deliveries (or a
  // replay racing a live delivery) execute the handler at most once.
  const idemKey = `webhook:${vendor}:${reference ?? eventId}`;

  try {
    const result = await withIdempotency(idemKey, { vendor, eventType, reference }, () =>
      handler({ eventId, vendor, eventType, reference, payload })
    );
    await query(
      `UPDATE webhook_events SET status = 'processed', processed = true, processed_at = now(), error = NULL, result = $2 WHERE id = $1`,
      [eventId, JSON.stringify(result ?? {})]
    );
    await logAudit("system:webhook", "webhook_processed", "webhook_event", eventId, { vendor, eventType, reference });
    return { eventId, status: "processed" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    await query(
      `UPDATE webhook_events
         SET status = 'failed', retry_count = retry_count + 1, error = $2,
             next_retry_at = now() + (interval '1 minute' * power(2, LEAST(retry_count, 6)))
       WHERE id = $1`,
      [eventId, message]
    );
    await logAudit("system:webhook", "webhook_failed", "webhook_event", eventId, { vendor, error: message });
    return { eventId, status: "failed" };
  }
}

export interface ReplayResult {
  scanned: number;
  processed: number;
  stillFailed: number;
}

// Reprocesses failed webhook events whose backoff has elapsed. Idempotent:
// because processing runs under withIdempotency and every handler re-verifies
// with the provider, replaying can never double-apply a state change.
export async function replayFailedWebhooks(limit = 100): Promise<ReplayResult> {
  const { rows } = await query<{
    id: string;
    vendor: string;
    event_type: string | null;
    reference: string | null;
    raw: unknown;
  }>(
    `SELECT id, vendor, event_type, reference, raw FROM webhook_events
      WHERE status = 'failed' AND (next_retry_at IS NULL OR next_retry_at <= now())
      ORDER BY received_at ASC LIMIT $1`,
    [limit]
  );

  const result: ReplayResult = { scanned: rows.length, processed: 0, stillFailed: 0 };
  for (const row of rows) {
    const handler = handlers.get(row.vendor);
    if (!handler) {
      result.stillFailed += 1;
      continue;
    }
    const outcome = await processStoredEvent(row.id, row.vendor, row.event_type, row.reference, row.raw, handler);
    if (outcome.status === "processed") result.processed += 1;
    else result.stillFailed += 1;
  }
  return result;
}
