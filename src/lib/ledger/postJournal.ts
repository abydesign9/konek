import { withTransaction } from "@/lib/db";
import { assertBalanced } from "./assertBalanced";
import { PostJournalInput } from "./types";

// Inserts a balanced journal + its entries, and updates the cached
// per-account balance, all in one DB transaction. The DB's deferred
// constraint trigger re-checks the balance at COMMIT as a backstop.
export async function postJournal(input: PostJournalInput): Promise<{ journalId: string }> {
  assertBalanced(input.entries);

  return withTransaction(async (client) => {
    const journalResult = await client.query<{ id: string }>(
      `INSERT INTO journals (txn_id, description) VALUES ($1, $2) RETURNING id`,
      [input.txnId ?? null, input.description]
    );
    const journalId = journalResult.rows[0].id;

    for (const entry of input.entries) {
      await client.query(
        `INSERT INTO ledger_entries (journal_id, account_id, amount_minor, currency)
         VALUES ($1, $2, $3, $4)`,
        [journalId, entry.accountId, entry.amountMinor, entry.currency]
      );

      await client.query(
        `INSERT INTO account_balances (account_id, balance_minor)
         VALUES ($1, $2)
         ON CONFLICT (account_id)
         DO UPDATE SET balance_minor = account_balances.balance_minor + EXCLUDED.balance_minor,
                        updated_at = now()`,
        [entry.accountId, entry.amountMinor]
      );
    }

    return { journalId };
  });
}
