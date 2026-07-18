import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import crypto from "node:crypto";

// DB-gated. Verifies USD inflow crediting is idempotent + balanced end-to-end.
//   DATABASE_URL=postgres://... npx vitest run --no-file-parallelism dollarInflow.integration
const HAS_DB = !!process.env.DATABASE_URL;
const PROVIDER_REF = `fincra_it_${crypto.randomUUID().slice(0, 8)}`;

describe.skipIf(!HAS_DB)("USD inflow crediting (integration)", () => {
  let pool: pg.Pool;
  let creditDollarInflow: typeof import("./dollarAccountService").creditDollarInflow;
  let registerMockInflow: typeof import("@/vendors/dollarAccount/mockFincra").registerMockInflow;
  let userId: string;
  const inflowRef = `inflow_it_${crypto.randomUUID()}`;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    ({ creditDollarInflow } = await import("./dollarAccountService"));
    ({ registerMockInflow } = await import("@/vendors/dollarAccount/mockFincra"));

    userId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO users (id, email, full_name, kyc_tier, kyc_status, referral_code)
       VALUES ($1,$2,'Dollar Test',2,'verified',$3)`,
      [userId, `usd-${userId}@test.local`, userId.replace(/-/g, "").slice(0, 8).toUpperCase()]
    );
    await pool.query(
      `INSERT INTO virtual_accounts (user_id, provider, provider_ref, currency, account_number, routing_number, bank_name)
       VALUES ($1,'mock_fincra',$2,'USD','0123456789','026073150','Fincra Partner Bank (Mock)')`,
      [userId, PROVIDER_REF]
    );
    registerMockInflow(inflowRef, {
      status: "received",
      accountProviderRef: PROVIDER_REF,
      amountMinor: 25000, // $250.00
      currency: "USD",
      senderName: "Jane Diaspora",
      senderBank: "Chase",
    });
  }, 60_000);

  afterAll(async () => {
    if (!pool) return;
    await pool.query(`DELETE FROM ledger_entries WHERE journal_id IN (SELECT id FROM journals WHERE txn_id IN (SELECT id FROM transactions WHERE user_id=$1))`, [userId]).catch(() => {});
    await pool.query(`DELETE FROM virtual_account_inflows WHERE virtual_account_id IN (SELECT id FROM virtual_accounts WHERE user_id=$1)`, [userId]).catch(() => {});
    await pool.query(`UPDATE transactions SET journal_id=NULL WHERE user_id=$1`, [userId]).catch(() => {});
    await pool.query(`DELETE FROM transaction_events WHERE txn_id IN (SELECT id FROM transactions WHERE user_id=$1)`, [userId]).catch(() => {});
    await pool.query(`DELETE FROM journals WHERE txn_id IN (SELECT id FROM transactions WHERE user_id=$1)`, [userId]).catch(() => {});
    await pool.query(`DELETE FROM transactions WHERE user_id=$1`, [userId]).catch(() => {});
    await pool.query(`DELETE FROM virtual_accounts WHERE user_id=$1`, [userId]).catch(() => {});
    await pool.query(`DELETE FROM account_balances WHERE account_id IN (SELECT id FROM ledger_accounts WHERE owner_id=$1)`, [userId]).catch(() => {});
    await pool.query(`DELETE FROM idempotency_keys WHERE key = $1`, [`dollar_inflow:${inflowRef}`]).catch(() => {});
    await pool.query(`DELETE FROM ledger_entries WHERE account_id IN (SELECT id FROM ledger_accounts WHERE owner_id=$1)`, [userId]).catch(() => {});
    await pool.query(`DELETE FROM ledger_accounts WHERE owner_id=$1`, [userId]).catch(() => {});
    await pool.query(`UPDATE account_balances ab SET balance_minor = COALESCE((SELECT SUM(amount_minor) FROM ledger_entries e WHERE e.account_id=ab.account_id),0)`).catch(() => {});
    await pool.query(`DELETE FROM users WHERE id=$1`, [userId]).catch(() => {});
    await pool.end();
  });

  it("credits the USD wallet exactly once across duplicate deliveries", async () => {
    await creditDollarInflow(inflowRef);
    await creditDollarInflow(inflowRef); // duplicate delivery

    // USD wallet balance from the ledger = the verified amount, once.
    const { rows: bal } = await pool.query(
      `SELECT COALESCE(SUM(e.amount_minor),0) v FROM ledger_entries e
         JOIN ledger_accounts a ON a.id=e.account_id
        WHERE a.owner_id=$1 AND a.kind='wallet' AND a.currency='USD'`,
      [userId]
    );
    expect(Number(bal[0].v)).toBe(25000);

    // Exactly one credited inflow row + one dollar_inflow transaction.
    const { rows: inflows } = await pool.query(
      `SELECT count(*)::int n FROM virtual_account_inflows WHERE provider_ref=$1 AND status='credited'`,
      [inflowRef]
    );
    expect(inflows[0].n).toBe(1);
    const { rows: txns } = await pool.query(`SELECT count(*)::int n FROM transactions WHERE user_id=$1 AND type='dollar_inflow'`, [userId]);
    expect(txns[0].n).toBe(1);
  }, 60_000);
});
