import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import pg from "pg";
import crypto from "node:crypto";
import type { VendorAdapter, VendorPlan, VendorServiceType } from "@/vendors/types";

// DB-gated (see other *.integration.test.ts). Covers webhook duplicate/replay
// idempotency and catalog drift + fail-closed margin protection end-to-end.
//   DATABASE_URL=postgres://... npx vitest run --no-file-parallelism webhookCatalog.integration

const HAS_DB = !!process.env.DATABASE_URL;
const HOOK_VENDOR = "itest_hook";
const CAT_VENDOR = "itest_vtu";
const SECRET = "whsec_itest";

describe.skipIf(!HAS_DB)("webhook + catalog (integration)", () => {
  let pool: pg.Pool;
  let receiveWebhook: typeof import("./webhookFramework").receiveWebhook;
  let replayFailedWebhooks: typeof import("./webhookFramework").replayFailedWebhooks;
  let registerWebhookHandler: typeof import("./webhookFramework").registerWebhookHandler;
  let syncVendorCatalog: typeof import("@/lib/catalog/catalogSync").syncVendorCatalog;

  let hookCalls = 0;
  let hookShouldFail = false;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    ({ receiveWebhook, replayFailedWebhooks, registerWebhookHandler } = await import("./webhookFramework"));
    ({ syncVendorCatalog } = await import("@/lib/catalog/catalogSync"));
    registerWebhookHandler(HOOK_VENDOR, async () => {
      hookCalls += 1;
      if (hookShouldFail) throw new Error("simulated downstream failure");
      return { ok: true };
    });
  }, 60_000);

  afterAll(async () => {
    if (!pool) return;
    await pool.query(`DELETE FROM webhook_events WHERE vendor = $1`, [HOOK_VENDOR]).catch(() => {});
    await pool.query(`DELETE FROM idempotency_keys WHERE key LIKE 'webhook:' || $1 || ':%'`, [HOOK_VENDOR]).catch(() => {});
    await pool.query(`DELETE FROM catalog_items WHERE vendor = $1`, [CAT_VENDOR]).catch(() => {});
    await pool.query(`DELETE FROM catalog_sync_runs WHERE vendor = $1`, [CAT_VENDOR]).catch(() => {});
    await pool.end();
  });

  beforeEach(() => {
    hookCalls = 0;
    hookShouldFail = false;
  });

  function sign(body: string) {
    return crypto.createHmac("sha512", SECRET).update(body).digest("hex");
  }
  const extract = (p: Record<string, unknown>) => ({
    eventType: typeof p.event === "string" ? p.event : null,
    reference: typeof (p.data as { reference?: unknown })?.reference === "string" ? ((p.data as { reference: string }).reference) : null,
  });
  const handler = async (ctx: { vendor: string }) => {
    hookCalls += 1;
    if (hookShouldFail) throw new Error("simulated downstream failure");
    return { ok: true, vendor: ctx.vendor };
  };

  it("processes a duplicate delivery only once (idempotent)", async () => {
    const body = JSON.stringify({ event: "x", data: { reference: "DUP1" } });
    const sig = sign(body);
    const r1 = await receiveWebhook({ vendor: HOOK_VENDOR, rawBody: body, signature: sig, secret: SECRET, extract, handler });
    const r2 = await receiveWebhook({ vendor: HOOK_VENDOR, rawBody: body, signature: sig, secret: SECRET, extract, handler });
    expect(r1.status).toBe("processed");
    expect(r2.status).toBe("processed");
    expect(hookCalls).toBe(1); // handler ran exactly once across two deliveries
  }, 60_000);

  it("persists+rejects an invalid signature without processing", async () => {
    const body = JSON.stringify({ event: "x", data: { reference: "BADSIG" } });
    const r = await receiveWebhook({ vendor: HOOK_VENDOR, rawBody: body, signature: "nope", secret: SECRET, extract, handler });
    expect(r.status).toBe("rejected");
    expect(hookCalls).toBe(0);
    const { rows } = await pool.query(`SELECT signature_valid, status FROM webhook_events WHERE id = $1`, [r.eventId]);
    expect(rows[0].signature_valid).toBe(false);
    expect(rows[0].status).toBe("rejected");
  }, 60_000);

  it("replays a failed webhook to success, idempotently", async () => {
    const body = JSON.stringify({ event: "x", data: { reference: "REP1" } });
    const sig = sign(body);
    hookShouldFail = true;
    const r = await receiveWebhook({ vendor: HOOK_VENDOR, rawBody: body, signature: sig, secret: SECRET, extract, handler });
    expect(r.status).toBe("failed");

    // Backdate the backoff so the replay worker picks it up now.
    await pool.query(`UPDATE webhook_events SET next_retry_at = now() - interval '1 minute' WHERE id = $1`, [r.eventId]);

    hookShouldFail = false;
    const replay1 = await replayFailedWebhooks(50);
    expect(replay1.processed).toBeGreaterThanOrEqual(1);
    const { rows } = await pool.query(`SELECT status FROM webhook_events WHERE id = $1`, [r.eventId]);
    expect(rows[0].status).toBe("processed");

    // A second replay must not reprocess it.
    const before = hookCalls;
    await replayFailedWebhooks(50);
    const { rows: rows2 } = await pool.query(`SELECT status FROM webhook_events WHERE id = $1`, [r.eventId]);
    expect(rows2[0].status).toBe("processed");
    expect(hookCalls).toBe(before);
  }, 60_000);

  // --- Catalog ---
  function fakeAdapter(plans: VendorPlan[]): VendorAdapter {
    return {
      id: CAT_VENDOR,
      capabilities: {
        services: ["data"],
        supportsRequery: true,
        supportsWebhooks: false,
        supportsBalance: true,
        supportsCatalog: true,
        deliveryMode: "sync",
      },
      purchase: async () => ({ vendorRef: "x", status: "delivered" }),
      verify: async () => ({ status: "delivered" }),
      balance: async () => 0,
      health: async () => true,
      listPlans: async (st: VendorServiceType) => (st === "data" ? plans : []),
    };
  }

  it("upserts plans, then deactivates (never deletes) plans that vanish", async () => {
    const A: VendorPlan = { externalId: "IT-A", name: "Plan A", network: "mtn", costMinor: 10000, priceMinor: 0, currency: "NGN" };
    const B: VendorPlan = { externalId: "IT-B", name: "Plan B", network: "mtn", costMinor: 20000, priceMinor: 0, currency: "NGN" };

    await syncVendorCatalog(fakeAdapter([A, B]), ["data"]);
    let { rows } = await pool.query(`SELECT external_id, price_minor, active FROM catalog_items WHERE vendor = $1 ORDER BY external_id`, [CAT_VENDOR]);
    expect(rows.map((r) => r.external_id)).toEqual(["IT-A", "IT-B"]);
    expect(Number(rows[0].price_minor)).toBe(10500); // 5% markup
    expect(rows.every((r) => r.active)).toBe(true);

    // Drift: B disappears from the provider list.
    await syncVendorCatalog(fakeAdapter([A]), ["data"]);
    ({ rows } = await pool.query(`SELECT external_id, active FROM catalog_items WHERE vendor = $1 ORDER BY external_id`, [CAT_VENDOR]));
    expect(rows.find((r) => r.external_id === "IT-B")!.active).toBe(false); // deactivated, not deleted
    expect(rows.find((r) => r.external_id === "IT-A")!.active).toBe(true);
  }, 60_000);

  it("fails closed on a margin breach: keeps existing pricing, records a skip", async () => {
    // Seed a locked manual price with a healthy margin.
    await pool.query(
      `INSERT INTO catalog_items (vendor, service_type, external_id, name, network, cost_minor, price_minor, currency, price_locked, active)
       VALUES ($1,'data','IT-LOCK','Locked','mtn',8000,10000,'NGN',true,true)
       ON CONFLICT (vendor, service_type, external_id) DO UPDATE SET cost_minor=8000, price_minor=10000, price_locked=true, active=true`,
      [CAT_VENDOR]
    );
    // Provider cost spikes to 9950 → margin against locked 10000 is 50bps < 200bps floor.
    const spike: VendorPlan = { externalId: "IT-LOCK", name: "Locked", network: "mtn", costMinor: 9950, priceMinor: 0, currency: "NGN" };
    const run = await syncVendorCatalog(fakeAdapter([spike]), ["data"]);

    expect(run.skippedMargin).toBeGreaterThanOrEqual(1);
    const { rows } = await pool.query(`SELECT cost_minor, price_minor FROM catalog_items WHERE vendor = $1 AND external_id = 'IT-LOCK'`, [CAT_VENDOR]);
    expect(Number(rows[0].cost_minor)).toBe(8000); // new cost NOT published
    expect(Number(rows[0].price_minor)).toBe(10000); // existing price preserved
  }, 60_000);
});
