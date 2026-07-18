import { withTransaction } from "@/lib/db";
import { assertBalanced } from "./assertBalanced";
import { PostJournalInput } from "./types";

// A minimal transaction-client shape (pg Pool/PoolClient both satisfy it).
type Client = { query: (text: string, params?: unknown[]) => Promise<{ rows: { id: string }[] }> };

async function postJournalOnClient(client: Client, input: PostJournalInput): Promise<{ journalId: string }> {
  const journalResult = await client.query(
    `INSERT INTO journals (txn_id, description, journal_type) VALUES ($1, $2, $3) RETURNING id`,
    [input.txnId ?? null, input.description, input.journalType ?? null]
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
}

// Inserts a balanced journal + its entries, and updates the cached
// per-account balance, all in one DB transaction. The DB's deferred
// constraint trigger re-checks the balance at COMMIT as a backstop.
//
// Pass an existing transaction `client` to compose this into a larger atomic
// unit (e.g. an idempotent refund that must claim the transaction and post its
// reversal in the same transaction). Without one, it opens its own transaction.
export async function postJournal(
  input: PostJournalInput,
  client?: Client
): Promise<{ journalId: string }> {
  assertBalanced(input.entries);

  if (client) return postJournalOnClient(client, input);
  return withTransaction((tx) => postJournalOnClient(tx as unknown as Client, input));
}
