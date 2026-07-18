import { describe, expect, it, beforeAll, afterAll } from "vitest";
import pg from "pg";
import crypto from "node:crypto";
import { cleanupTestUser, resyncBalances } from "@/lib/ledger/integrationCleanup";

// ============================================================================
// Double-spend concurrency test (M2). REQUIRES a migrated Postgres — it is
// skipped unless DATABASE_URL is set, because the whole point is to exercise the
// real wallet_nonneg trigger + row-level locking that no mock can reproduce.
//
//   Run against a throwaway/test database (SERIALLY — the integration suites
//   share global platform ledger accounts, so run them one file at a time):
//     DATABASE_URL=postgres://... npx vitest run --no-file-parallelism \
//       purchaseConcurrency.integration reservationLifecycle.integration
//
// Scenario: fund a wallet for EXACTLY one purchase, then fire 10 simultaneous
// purchases with distinct idempotency keys. Expect exactly one to succeed, the
// rest to fail with InsufficientBalanceError, the wallet to never go negative,
// and exactly one reservation + one settlement journal to exist.
// ============================================================================

const HAS_DB = !!process.env.DATABASE_URL;
const AMOUNT = 10_000; // ₦100 in kobo — funds exactly one purchase

describe.skipIf(!HAS_DB)("purchaseVtu — concurrent double-spend protection", () => {
  let pool: pg.Pool;
  let userId: string;
  // Imported lazily so the module graph (which reads DATABASE_URL) only loads
  // when we actually have a DB.
  let purchaseVtu: typeof import("./purchaseVtuService").purchaseVtu;
  let InsufficientBalanceError: typeof import("./purchaseVtuService").InsufficientBalanceError;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const svc = await import("./purchaseVtuService");
    purchaseVtu = svc.purchaseVtu;
    InsufficientBalanceError = svc.InsufficientBalanceError;
    const { getUserWalletAccount, getPlatformAccount } = await import("@/lib/ledger/accounts");
    const { postJournal } = await import("@/lib/ledger/postJournal");

    // A user on a tier with no configured limits (velocity check is a no-op).
    userId = crypto.randomUUID();
    const referralCode = userId.replace(/-/g, "").slice(0, 8).toUpperCase();
    await pool.query(
      `INSERT INTO users (id, email, full_name, kyc_tier, kyc_status, referral_code)
       VALUES ($1, $2, 'Conc Test', 5, 'verified', $3)`,
      [userId, `conc-${userId}@test.local`, referralCode]
    );

    // Ensure a healthy VTU vendor whose adapter is registered.
    await pool.query(`UPDATE vendors SET healthy = true WHERE id IN ('mock_vtu', 'mock_vtu_2')`);

    // Fund the wallet with EXACTLY one purchase worth, through the real ledger.
    const walletId = await getUserWalletAccount(userId, "NGN");
    const gatewayId = await getPlatformAccount("NGN", "gateway");
    await postJournal({
      journalType: "funding",
      description: "concurrency test funding",
      entries: [
        { accountId: gatewayId, amountMinor: -AMOUNT, currency: "NGN" },
        { accountId: walletId, amountMinor: AMOUNT, currency: "NGN" },
      ],
    });
  }, 60_000);

  afterAll(async () => {
    if (!pool) return;
    try {
      await cleanupTestUser(pool, userId);
    } finally {
      // Always resync — even if a cleanup query hit a transient pooler hiccup —
      // so the cached balances can never be left drifted.
      await resyncBalances(pool).catch(() => {});
      await pool.end();
    }
  });

  it("lets exactly one of 10 concurrent purchases win, wallet never negative", async () => {
    const attempts = Array.from({ length: 10 }, (_, i) =>
      purchaseVtu({
        userId,
        idempotencyKey: `conc-${i}-${crypto.randomUUID()}`,
        serviceType: "airtime",
        network: "mtn",
        phone: "08031234567", // does not end in 0000 -> mock vendor delivers
        amountMinor: AMOUNT,
      })
    );

    const results = await Promise.allSettled(attempts);

    const delivered = results.filter((r) => r.status === "fulfilled" && r.value.status === "delivered");
    const insufficient = results.filter(
      (r) => r.status === "rejected" && r.reason instanceof InsufficientBalanceError
    );

    expect(delivered).toHaveLength(1);
    expect(insufficient).toHaveLength(9);

    // Wallet: recomputed straight from the ledger, must be exactly 0 (never < 0).
    const { rows: wb } = await pool.query(
      `SELECT COALESCE(SUM(e.amount_minor), 0) AS bal
         FROM ledger_entries e
         JOIN ledger_accounts a ON a.id = e.account_id
        WHERE a.owner_id = $1 AND a.kind = 'wallet'`,
      [userId]
    );
    expect(Number(wb[0].bal)).toBe(0);

    // Cached balance matches and is also non-negative.
    const { rows: cb } = await pool.query(
      `SELECT COALESCE(ab.balance_minor, 0) AS bal
         FROM ledger_accounts a LEFT JOIN account_balances ab ON ab.account_id = a.id
        WHERE a.owner_id = $1 AND a.kind = 'wallet'`,
      [userId]
    );
    expect(Number(cb[0].bal)).toBe(0);

    // Exactly one reservation, settled.
    const { rows: resv } = await pool.query(
      `SELECT status, COUNT(*) AS n FROM reservations WHERE user_id = $1 GROUP BY status`,
      [userId]
    );
    expect(resv).toHaveLength(1);
    expect(resv[0].status).toBe("settled");
    expect(Number(resv[0].n)).toBe(1);

    // Exactly one settlement journal and one delivered transaction.
    const { rows: settleJournals } = await pool.query(
      `SELECT COUNT(*) AS n FROM journals j
         JOIN transactions t ON t.id = j.txn_id
        WHERE t.user_id = $1 AND j.journal_type = 'settlement'`,
      [userId]
    );
    expect(Number(settleJournals[0].n)).toBe(1);

    const { rows: deliveredTxns } = await pool.query(
      `SELECT COUNT(*) AS n FROM transactions WHERE user_id = $1 AND status = 'delivered'`,
      [userId]
    );
    expect(Number(deliveredTxns[0].n)).toBe(1);
  }, 60_000);
});
