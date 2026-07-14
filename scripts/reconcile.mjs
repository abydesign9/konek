// Ledger reconciliation: verifies the cached account_balances table matches
// what the ledger_entries actually sum to (source of truth), and that every
// journal is internally balanced per currency. Run daily in production;
// zero drift is the expected steady state — any nonzero row means the
// cache and the ledger have diverged and needs investigation before it
// compounds.
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

let failed = false;

console.log("=== Konek ledger reconciliation ===\n");

// 1. Cached balance vs. recomputed sum, per account.
const { rows: accounts } = await pool.query(`
  SELECT
    la.id, la.owner_type, la.owner_id, la.currency, la.kind,
    COALESCE(ab.balance_minor, 0) AS cached_minor,
    COALESCE((SELECT SUM(amount_minor) FROM ledger_entries WHERE account_id = la.id), 0) AS recomputed_minor
  FROM ledger_accounts la
  LEFT JOIN account_balances ab ON ab.account_id = la.id
  ORDER BY la.owner_type, la.kind, la.currency
`);

console.log(`Checking ${accounts.length} accounts for cache drift...`);
let driftCount = 0;
for (const acc of accounts) {
  const cached = Number(acc.cached_minor);
  const recomputed = Number(acc.recomputed_minor);
  if (cached !== recomputed) {
    driftCount += 1;
    failed = true;
    console.log(
      `  DRIFT  ${acc.owner_type}/${acc.kind}/${acc.currency} (${acc.id}): cached=${cached} recomputed=${recomputed} diff=${cached - recomputed}`
    );
  }
}
console.log(driftCount === 0 ? "  PASS — no drift found\n" : `  FAIL — ${driftCount} account(s) drifted\n`);

// 2. Every journal balances per currency (belt-and-suspenders check on top
//    of the DB's own deferred constraint trigger).
const { rows: unbalanced } = await pool.query(`
  SELECT journal_id, currency, SUM(amount_minor) AS sum
  FROM ledger_entries
  GROUP BY journal_id, currency
  HAVING SUM(amount_minor) <> 0
`);

console.log(`Checking journal balance invariant...`);
if (unbalanced.length > 0) {
  failed = true;
  for (const row of unbalanced) {
    console.log(`  UNBALANCED journal ${row.journal_id} (${row.currency}): sum=${row.sum}`);
  }
  console.log(`  FAIL — ${unbalanced.length} unbalanced journal(s)\n`);
} else {
  console.log("  PASS — every journal balances\n");
}

console.log(failed ? "=== RECONCILIATION FAILED ===" : "=== RECONCILIATION PASSED — zero drift ===");
await pool.end();
process.exit(failed ? 1 : 0);
