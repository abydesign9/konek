import { describe, expect, it, beforeAll, afterAll } from "vitest";
import pg from "pg";
import crypto from "node:crypto";
import { cleanupTestUser, resyncBalances } from "@/lib/ledger/integrationCleanup";

// ============================================================================
// Reservation recovery + refund regression, end-to-end against a real Postgres.
// Skipped unless DATABASE_URL is set (see the concurrency test for rationale).
//
//   DATABASE_URL=postgres://... npx vitest run --no-file-parallelism \
//     reservationLifecycle.integration purchaseConcurrency.integration
//   (Run integration suites serially — they share global platform accounts.)
//
// Covers, against the live DB:
//   * inline vendor decline -> release (wallet refunded)
//   * recovery settles a stranded 'held' reservation whose vendor delivered
//   * duplicate cron run is idempotent (no second settlement journal)
//   * recovery releases a reservation whose vendor was never engaged
//   * refund of a reservation-based (multi-journal) delivered purchase
//   * refund of a legacy single-journal delivered purchase (back-compat)
// The failed/pending decision branches are covered by the unit test
// reservationRecovery.test.ts (the real mock adapter's verify() only returns
// 'delivered', so those branches can't be driven end-to-end here).
// ============================================================================

const HAS_DB = !!process.env.DATABASE_URL;
const AMOUNT = 10_000;

describe.skipIf(!HAS_DB)("reservation lifecycle + refund (integration)", () => {
  let pool: pg.Pool;
  const createdUsers: string[] = [];

  let purchaseVtu: typeof import("@/lib/purchases/purchaseVtuService").purchaseVtu;
  let recoverStaleReservations: typeof import("./reservationRecovery").recoverStaleReservations;
  let refundTransaction: typeof import("./refund").refundTransaction;
  let TransactionNotRefundableError: typeof import("./refund").TransactionNotRefundableError;
  let postJournal: typeof import("./postJournal").postJournal;
  let getUserWalletAccount: typeof import("./accounts").getUserWalletAccount;
  let getPlatformAccount: typeof import("./accounts").getPlatformAccount;
  let getOrCreateAccount: typeof import("./accounts").getOrCreateAccount;
  let getBalance: typeof import("./balance").getBalance;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    ({ purchaseVtu } = await import("@/lib/purchases/purchaseVtuService"));
    ({ recoverStaleReservations } = await import("./reservationRecovery"));
    ({ refundTransaction, TransactionNotRefundableError } = await import("./refund"));
    ({ postJournal } = await import("./postJournal"));
    ({ getUserWalletAccount, getPlatformAccount, getOrCreateAccount } = await import("./accounts"));
    ({ getBalance } = await import("./balance"));
    await pool.query(`UPDATE vendors SET healthy = true WHERE id IN ('mock_vtu','mock_vtu_2')`);
  }, 60_000);

  afterAll(async () => {
    if (!pool) return;
    try {
      for (const uid of createdUsers) await cleanupTestUser(pool, uid).catch(() => {});
    } finally {
      await resyncBalances(pool).catch(() => {});
      await pool.end();
    }
  });

  async function makeFundedUser(amount = AMOUNT): Promise<{ userId: string; walletId: string }> {
    const userId = crypto.randomUUID();
    createdUsers.push(userId);
    await pool.query(
      `INSERT INTO users (id, email, full_name, kyc_tier, kyc_status, referral_code)
       VALUES ($1, $2, 'Lifecycle Test', 5, 'verified', $3)`,
      [userId, `life-${userId}@test.local`, userId.replace(/-/g, "").slice(0, 8).toUpperCase()]
    );
    const walletId = await getUserWalletAccount(userId, "NGN");
    const gatewayId = await getPlatformAccount("NGN", "gateway");
    await postJournal({
      journalType: "funding",
      description: "lifecycle funding",
      entries: [
        { accountId: gatewayId, amountMinor: -amount, currency: "NGN" },
        { accountId: walletId, amountMinor: amount, currency: "NGN" },
      ],
    });
    return { userId, walletId };
  }

  async function countJournals(txnId: string, type: string): Promise<number> {
    const { rows } = await pool.query(`SELECT COUNT(*) n FROM journals WHERE txn_id = $1 AND journal_type = $2`, [txnId, type]);
    return Number(rows[0].n);
  }

  it("inline vendor decline releases the reservation and refunds the wallet", async () => {
    const { userId, walletId } = await makeFundedUser();
    const res = await purchaseVtu({
      userId,
      idempotencyKey: `decline-${crypto.randomUUID()}`,
      serviceType: "airtime",
      network: "mtn",
      phone: "08030000", // ends 0000 -> mock vendor declines
      amountMinor: AMOUNT,
    });
    expect(res.status).toBe("failed");
    expect(await getBalance(walletId)).toBe(AMOUNT); // fully refunded
    const { rows } = await pool.query(`SELECT status FROM reservations WHERE txn_id = $1`, [res.txnId]);
    expect(rows[0].status).toBe("released");
    expect(await countJournals(res.txnId, "release")).toBe(1);
    expect(await countJournals(res.txnId, "settlement")).toBe(0);
  }, 60_000);

  it("recovery settles a stranded held reservation, and is idempotent across duplicate cron runs", async () => {
    const { userId, walletId } = await makeFundedUser();
    const reserveId = await getPlatformAccount("NGN", "reserve");

    // Simulate a crash after the vendor delivered but before settlement:
    // txn is pending_vendor with a vendor_ref, reservation is 'held', and the
    // reservation journal (wallet -> reserve) has already been posted.
    const txnId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO transactions (id, user_id, idempotency_key, type, status, currency, amount_minor, vendor, vendor_ref, recipient)
       VALUES ($1,$2,$3,'airtime','pending_vendor','NGN',$4,'mock_vtu',$5,'{}')`,
      [txnId, userId, `strand-${txnId}`, AMOUNT, `mock_vtu_${txnId}`]
    );
    const { journalId } = await postJournal({
      txnId,
      journalType: "reservation",
      description: "stranded reservation",
      entries: [
        { accountId: walletId, amountMinor: -AMOUNT, currency: "NGN" },
        { accountId: reserveId, amountMinor: AMOUNT, currency: "NGN" },
      ],
    });
    await pool.query(
      `INSERT INTO reservations (txn_id, user_id, wallet_account_id, reserve_account_id, amount_minor, currency, reservation_journal_id, created_at)
       VALUES ($1,$2,$3,$4,$5,'NGN',$6, now() - interval '10 minutes')`,
      [txnId, userId, walletId, reserveId, AMOUNT, journalId]
    );

    expect(await getBalance(walletId)).toBe(0); // reserved

    const r1 = await recoverStaleReservations(5);
    expect(r1.settled).toBeGreaterThanOrEqual(1);

    const { rows: after } = await pool.query(`SELECT status FROM reservations WHERE txn_id = $1`, [txnId]);
    expect(after[0].status).toBe("settled");
    expect(await countJournals(txnId, "settlement")).toBe(1);
    const { rows: txnAfter } = await pool.query(`SELECT status FROM transactions WHERE id = $1`, [txnId]);
    expect(txnAfter[0].status).toBe("delivered");

    // Duplicate cron run — must not post a second settlement.
    await recoverStaleReservations(5);
    expect(await countJournals(txnId, "settlement")).toBe(1);
  }, 60_000);

  it("a pending vendor result keeps funds reserved, then recovery settles it", async () => {
    const { userId, walletId } = await makeFundedUser();
    // Phone ending 9999 -> mock vendor returns 'pending' (async ack).
    const res = await purchaseVtu({
      userId,
      idempotencyKey: `pending-${crypto.randomUUID()}`,
      serviceType: "airtime",
      network: "mtn",
      phone: "08039999",
      amountMinor: AMOUNT,
    });
    expect(res.status).toBe("pending");
    // Funds stay reserved (NOT refunded), transaction stays pending_vendor.
    expect(await getBalance(walletId)).toBe(0);
    const { rows: r1 } = await pool.query(`SELECT status FROM reservations WHERE txn_id = $1`, [res.txnId]);
    expect(r1[0].status).toBe("held");
    const { rows: t1 } = await pool.query(`SELECT status, vendor_ref FROM transactions WHERE id = $1`, [res.txnId]);
    expect(t1[0].status).toBe("pending_vendor");
    expect(t1[0].vendor_ref).toBeTruthy();

    // Backdate so the recovery worker picks it up, then verify() (mock -> delivered) settles it.
    await pool.query(`UPDATE reservations SET created_at = now() - interval '10 minutes' WHERE txn_id = $1`, [res.txnId]);
    await recoverStaleReservations(5);

    const { rows: r2 } = await pool.query(`SELECT status FROM reservations WHERE txn_id = $1`, [res.txnId]);
    expect(r2[0].status).toBe("settled");
    const { rows: t2 } = await pool.query(`SELECT status FROM transactions WHERE id = $1`, [res.txnId]);
    expect(t2[0].status).toBe("delivered");
    expect(await countJournals(res.txnId, "settlement")).toBe(1);
  }, 60_000);

  it("recovery releases a reservation whose vendor was never engaged", async () => {
    const { userId, walletId } = await makeFundedUser();
    const reserveId = await getPlatformAccount("NGN", "reserve");
    const txnId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO transactions (id, user_id, idempotency_key, type, status, currency, amount_minor, recipient)
       VALUES ($1,$2,$3,'airtime','initiated','NGN',$4,'{}')`,
      [txnId, userId, `novendor-${txnId}`, AMOUNT]
    );
    const { journalId } = await postJournal({
      txnId,
      journalType: "reservation",
      description: "reservation no vendor",
      entries: [
        { accountId: walletId, amountMinor: -AMOUNT, currency: "NGN" },
        { accountId: reserveId, amountMinor: AMOUNT, currency: "NGN" },
      ],
    });
    await pool.query(
      `INSERT INTO reservations (txn_id, user_id, wallet_account_id, reserve_account_id, amount_minor, currency, reservation_journal_id, created_at)
       VALUES ($1,$2,$3,$4,$5,'NGN',$6, now() - interval '10 minutes')`,
      [txnId, userId, walletId, reserveId, AMOUNT, journalId]
    );

    await recoverStaleReservations(5);
    const { rows } = await pool.query(`SELECT status FROM reservations WHERE txn_id = $1`, [txnId]);
    expect(rows[0].status).toBe("released");
    expect(await getBalance(walletId)).toBe(AMOUNT); // funds returned
  }, 60_000);

  it("refunds a reservation-based delivered purchase (multi-journal net reversal)", async () => {
    const { userId, walletId } = await makeFundedUser();
    const res = await purchaseVtu({
      userId,
      idempotencyKey: `refundme-${crypto.randomUUID()}`,
      serviceType: "airtime",
      network: "mtn",
      phone: "08031234567",
      amountMinor: AMOUNT,
    });
    expect(res.status).toBe("delivered");
    expect(await getBalance(walletId)).toBe(0);

    await refundTransaction(res.txnId, "admin@raviion.io");
    expect(await getBalance(walletId)).toBe(AMOUNT); // net reversal returns funds
    const { rows } = await pool.query(`SELECT status FROM transactions WHERE id = $1`, [res.txnId]);
    expect(rows[0].status).toBe("refunded");

    // Second refund is refused (idempotent claim).
    await expect(refundTransaction(res.txnId, "admin@raviion.io")).rejects.toBeInstanceOf(
      TransactionNotRefundableError
    );
  }, 60_000);

  it("refunds a legacy single-journal delivered purchase (back-compat)", async () => {
    const { userId, walletId } = await makeFundedUser();
    const floatId = await getOrCreateAccount("vendor", null, "NGN", "float");
    const txnId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO transactions (id, user_id, idempotency_key, type, status, currency, amount_minor, recipient)
       VALUES ($1,$2,$3,'airtime','delivered','NGN',$4,'{}')`,
      [txnId, userId, `legacy-${txnId}`, AMOUNT]
    );
    // Old single-journal shape: wallet -> vendor float, tagged 'purchase'.
    const { journalId } = await postJournal({
      txnId,
      journalType: "purchase",
      description: "legacy purchase",
      entries: [
        { accountId: walletId, amountMinor: -AMOUNT, currency: "NGN" },
        { accountId: floatId, amountMinor: AMOUNT, currency: "NGN" },
      ],
    });
    await pool.query(`UPDATE transactions SET journal_id = $2 WHERE id = $1`, [txnId, journalId]);
    expect(await getBalance(walletId)).toBe(0);

    await refundTransaction(txnId, "admin@raviion.io");
    expect(await getBalance(walletId)).toBe(AMOUNT);
    const { rows } = await pool.query(`SELECT status FROM transactions WHERE id = $1`, [txnId]);
    expect(rows[0].status).toBe("refunded");
  }, 60_000);
});
