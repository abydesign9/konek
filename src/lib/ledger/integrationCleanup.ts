import type pg from "pg";

// Test-only teardown helpers for the DB-gated integration tests. NOT used by
// application code (financial tables are append-only in production). Kept in a
// plain module so both integration test files share one correct implementation.

// Removes a test user's entire ledger footprint. Crucially, it captures journals
// two ways and deletes BOTH legs of each:
//   * journals touching the user's own accounts — e.g. the funding journal,
//     whose txn_id is NULL (account-linked only);
//   * journals linked to the user's transactions — e.g. settlement, whose legs
//     are both platform accounts (reserve/float) and touch no user account.
// Missing either set leaves half-balanced journals or platform drift.
export async function cleanupTestUser(pool: pg.Pool, userId: string): Promise<void> {
  const { rows } = await pool.query(
    `SELECT DISTINCT id FROM (
       SELECT e.journal_id AS id
         FROM ledger_entries e JOIN ledger_accounts a ON a.id = e.account_id
        WHERE a.owner_id = $1
       UNION
       SELECT j.id FROM journals j JOIN transactions t ON t.id = j.txn_id
        WHERE t.user_id = $1
     ) x`,
    [userId]
  );
  const jids = (rows as { id: string }[]).map((r) => r.id);

  await pool.query(`DELETE FROM reservations WHERE user_id = $1`, [userId]).catch(() => {});
  await pool.query(`UPDATE transactions SET journal_id = NULL WHERE user_id = $1`, [userId]).catch(() => {});
  if (jids.length) {
    await pool.query(`DELETE FROM ledger_entries WHERE journal_id = ANY($1)`, [jids]).catch(() => {});
    await pool.query(`DELETE FROM journals WHERE id = ANY($1)`, [jids]).catch(() => {});
  }
  await pool.query(`DELETE FROM transaction_events WHERE txn_id IN (SELECT id FROM transactions WHERE user_id = $1)`, [userId]).catch(() => {});
  await pool.query(`DELETE FROM transactions WHERE user_id = $1`, [userId]).catch(() => {});
  await pool.query(`DELETE FROM account_balances WHERE account_id IN (SELECT id FROM ledger_accounts WHERE owner_id = $1)`, [userId]).catch(() => {});
  await pool.query(`DELETE FROM ledger_accounts WHERE owner_id = $1`, [userId]).catch(() => {});
}

// Resyncs every cached balance to the ledger source of truth, repairing any
// platform-account drift the test run introduced.
export async function resyncBalances(pool: pg.Pool): Promise<void> {
  await pool.query(`
    UPDATE account_balances ab
       SET balance_minor = COALESCE((SELECT SUM(amount_minor) FROM ledger_entries e WHERE e.account_id = ab.account_id), 0),
           updated_at = now()
  `);
}
