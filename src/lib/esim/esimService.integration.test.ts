import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import crypto from "node:crypto";

// DB-gated. End-to-end eSIM lifecycle against a real Postgres.
//   DATABASE_URL=postgres://... npx vitest run --no-file-parallelism esimService.integration
const HAS_DB = !!process.env.DATABASE_URL;
const PLAN = "it-esim-us-5gb-30d";
const PROVIDER = "mock_vtu";

describe.skipIf(!HAS_DB)("eSIM service (integration)", () => {
  let pool: pg.Pool;
  let getEsimUsage: typeof import("./esimService").getEsimUsage;
  let getEsimActivation: typeof import("./esimService").getEsimActivation;
  let userId: string;
  let txnId: string;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    ({ getEsimUsage, getEsimActivation } = await import("./esimService"));

    userId = crypto.randomUUID();
    txnId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO users (id, email, full_name, kyc_tier, kyc_status, referral_code)
       VALUES ($1,$2,'eSIM Test',5,'verified',$3)`,
      [userId, `esim-${userId}@test.local`, userId.replace(/-/g, "").slice(0, 8).toUpperCase()]
    );
    await pool.query(
      `INSERT INTO catalog_items (vendor, service_type, external_id, name, network, cost_minor, price_minor, currency, meta, active)
       VALUES ($1,'esim',$2,'US 5GB / 30d','us',1200,1400,'USD',$3,true)
       ON CONFLICT (vendor, service_type, external_id) DO UPDATE SET meta = EXCLUDED.meta`,
      [PROVIDER, PLAN, JSON.stringify({ dataMb: 5000, validityDays: 30 })]
    );
    await pool.query(
      `INSERT INTO transactions (id, user_id, idempotency_key, type, status, currency, amount_minor, vendor, token, recipient)
       VALUES ($1,$2,$3,'esim','delivered','NGN',200000,$4,'ICCID-8991TEST0001',$5)`,
      [txnId, userId, `esim-${txnId}`, PROVIDER, JSON.stringify({ planExternalId: PLAN, network: "us" })]
    );
  }, 60_000);

  afterAll(async () => {
    if (!pool) return;
    await pool.query(`DELETE FROM esims WHERE user_id = $1`, [userId]).catch(() => {});
    await pool.query(`DELETE FROM transactions WHERE user_id = $1`, [userId]).catch(() => {});
    await pool.query(`DELETE FROM catalog_items WHERE vendor = $1 AND external_id = $2`, [PROVIDER, PLAN]).catch(() => {});
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]).catch(() => {});
    await pool.end();
  });

  it("lazily creates the esims row and returns usage against the sold allowance", async () => {
    const usage = await getEsimUsage(txnId, userId);
    expect(usage.iccid).toBe("ICCID-8991TEST0001");
    expect(usage.totalMb).toBe(5000);
    expect(usage.usedMb).toBeGreaterThanOrEqual(0);
    expect(usage.usedMb).toBeLessThanOrEqual(5000);
    expect(usage.remainingMb).toBe(5000 - usage.usedMb);
    expect(["active", "depleted"]).toContain(usage.status);

    // Row now exists and is idempotent on a second read.
    const { rows } = await pool.query(`SELECT count(*)::int n, max(total_mb) total FROM esims WHERE txn_id = $1`, [txnId]);
    expect(rows[0].n).toBe(1);
    expect(Number(rows[0].total)).toBe(5000);
    await getEsimUsage(txnId, userId);
    const { rows: rows2 } = await pool.query(`SELECT count(*)::int n FROM esims WHERE txn_id = $1`, [txnId]);
    expect(rows2[0].n).toBe(1);
  }, 60_000);

  it("returns a valid LPA activation", async () => {
    const a = await getEsimActivation(txnId, userId);
    expect(a.lpaString.startsWith("LPA:1$")).toBe(true);
    expect(a.lpaString).toContain(a.smdpAddress);
    expect(a.qrPayload).toBe(a.lpaString);
  }, 60_000);
});
