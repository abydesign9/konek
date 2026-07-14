import { query } from "@/lib/db";
import { postJournal } from "@/lib/ledger/postJournal";
import { logAudit } from "@/lib/audit";

export class TransactionNotRefundableError extends Error {
  constructor(status: string) {
    super(`Cannot refund a transaction in status '${status}' — only 'delivered' transactions can be refunded`);
    this.name = "TransactionNotRefundableError";
  }
}

interface LedgerEntryRow {
  account_id: string;
  amount_minor: string;
  currency: string;
}

// Reverses every entry in the original journal (same legs, negated amounts)
// as a brand-new balanced journal — we never edit or delete the original.
// State machine: delivered -> refunded only.
export async function refundTransaction(txnId: string, adminActor: string): Promise<{ journalId: string }> {
  const { rows: txnRows } = await query<{ status: string; journal_id: string | null; user_id: string }>(
    `SELECT status, journal_id, user_id FROM transactions WHERE id = $1`,
    [txnId]
  );
  const txn = txnRows[0];
  if (!txn) throw new Error("Transaction not found");
  if (txn.status !== "delivered" || !txn.journal_id) {
    throw new TransactionNotRefundableError(txn.status);
  }

  const { rows: entries } = await query<LedgerEntryRow>(
    `SELECT account_id, amount_minor, currency FROM ledger_entries WHERE journal_id = $1`,
    [txn.journal_id]
  );

  const { journalId } = await postJournal({
    txnId,
    description: `Refund of txn ${txnId}`,
    entries: entries.map((e) => ({
      accountId: e.account_id,
      amountMinor: -Number(e.amount_minor),
      currency: e.currency,
    })),
  });

  await query(
    `UPDATE transactions SET status = 'refunded', updated_at = now() WHERE id = $1`,
    [txnId]
  );
  await query(
    `INSERT INTO transaction_events (txn_id, from_status, to_status, detail) VALUES ($1, 'delivered', 'refunded', $2)`,
    [txnId, JSON.stringify({ reversalJournalId: journalId, admin: adminActor })]
  );
  await logAudit(adminActor, "refund", "transaction", txnId, { reversalJournalId: journalId });

  return { journalId };
}
