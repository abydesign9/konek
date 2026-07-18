import { describe, expect, it, vi, beforeEach } from "vitest";
import crypto from "node:crypto";

// Capture DB writes; INSERT returns an id, everything else is a no-op.
const writes: { sql: string; params: unknown[] }[] = [];
vi.mock("@/lib/db", () => ({
  query: vi.fn(async (sql: string, params: unknown[] = []) => {
    writes.push({ sql, params });
    if (sql.includes("INSERT INTO webhook_events")) return { rows: [{ id: "evt-1" }] };
    return { rows: [] };
  }),
}));
// Run the handler directly (idempotency itself is covered by the DB integration test).
vi.mock("@/lib/idempotency", () => ({
  withIdempotency: (_k: string, _p: unknown, fn: () => Promise<unknown>) => fn(),
  IdempotencyInProgressError: class extends Error {},
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => {}) }));

import { verifyHmacSignature, receiveWebhook } from "./webhookFramework";

const SECRET = "whsec_test";
function sign(body: string, algo: "sha256" | "sha512" = "sha512") {
  return crypto.createHmac(algo, SECRET).update(body).digest("hex");
}
const extract = (p: Record<string, unknown>) => ({
  eventType: typeof p.event === "string" ? p.event : null,
  reference: typeof (p.data as { reference?: unknown })?.reference === "string" ? ((p.data as { reference: string }).reference) : null,
});

describe("verifyHmacSignature", () => {
  it("accepts a correct signature and rejects wrong/tampered/missing ones", () => {
    const body = JSON.stringify({ event: "charge.success" });
    expect(verifyHmacSignature(body, sign(body), SECRET)).toBe(true);
    expect(verifyHmacSignature(body, sign(body + "x"), SECRET)).toBe(false); // tampered body
    expect(verifyHmacSignature(body, "deadbeef", SECRET)).toBe(false);
    expect(verifyHmacSignature(body, null, SECRET)).toBe(false);
    expect(verifyHmacSignature(body, sign(body), undefined)).toBe(false);
  });
});

describe("receiveWebhook", () => {
  beforeEach(() => {
    writes.length = 0;
  });

  it("rejects an invalid signature, persists it, and never runs the handler", async () => {
    const body = JSON.stringify({ event: "charge.success", data: { reference: "ref1" } });
    const handler = vi.fn(async () => ({ ok: true }));
    const res = await receiveWebhook({
      vendor: "paystack", rawBody: body, signature: "bad", secret: SECRET, extract, handler,
    });
    expect(res.status).toBe("rejected");
    expect(handler).not.toHaveBeenCalled();
    // Persisted with signature_valid = false, then marked rejected.
    expect(writes.some((w) => w.sql.includes("INSERT INTO webhook_events") && w.params[1] === false)).toBe(true);
    expect(writes.some((w) => w.sql.includes("status = 'rejected'"))).toBe(true);
  });

  it("processes a valid webhook and runs the handler once", async () => {
    const body = JSON.stringify({ event: "charge.success", data: { reference: "ref2" } });
    const handler = vi.fn(async (_ctx: { vendor: string; eventType: string | null; reference: string | null }) => ({
      credited: true,
    }));
    const res = await receiveWebhook({
      vendor: "paystack", rawBody: body, signature: sign(body), secret: SECRET, extract, handler,
    });
    expect(res.status).toBe("processed");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({ vendor: "paystack", eventType: "charge.success", reference: "ref2" });
    expect(writes.some((w) => w.sql.includes("status = 'processed'"))).toBe(true);
  });

  it("marks the event failed (for replay) when the handler throws", async () => {
    const body = JSON.stringify({ event: "charge.success", data: { reference: "ref3" } });
    const handler = vi.fn(async () => {
      throw new Error("downstream boom");
    });
    const res = await receiveWebhook({
      vendor: "paystack", rawBody: body, signature: sign(body), secret: SECRET, extract, handler,
    });
    expect(res.status).toBe("failed");
    expect(writes.some((w) => w.sql.includes("status = 'failed'") && w.sql.includes("retry_count = retry_count + 1"))).toBe(true);
  });
});
