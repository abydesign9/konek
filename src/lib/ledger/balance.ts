import { query } from "@/lib/db";

// Cached balance — fast path, correct as long as postJournal is the only writer.
export async function getBalance(accountId: string): Promise<number> {
  const { rows } = await query<{ balance_minor: string }>(
    `SELECT balance_minor FROM account_balances WHERE account_id = $1`,
    [accountId]
  );
  return rows[0] ? Number(rows[0].balance_minor) : 0;
}

// Recomputes straight from ledger_entries — source of truth, used for
// reconciliation (compare against getBalance to detect cache drift).
export async function recomputeBalance(accountId: string): Promise<number> {
  const { rows } = await query<{ sum: string | null }>(
    `SELECT SUM(amount_minor) AS sum FROM ledger_entries WHERE account_id = $1`,
    [accountId]
  );
  return rows[0]?.sum ? Number(rows[0].sum) : 0;
}
