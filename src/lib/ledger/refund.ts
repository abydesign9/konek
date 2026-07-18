import { withTransaction } from "@/lib/db";
import { postJournal } from "@/lib/ledger/postJournal";
import { logAudit } from "@/lib/audit";

export class TransactionNotRefundableError extends Error {
  constructor(status: string) {
    super(`Cannot refund a transaction in status '${status}' — only 'delivered' transactions can be refunded`);
    this.name = "TransactionNotRefundableError";
  }
}

interface NetEntryRow {
  account_id: string;
  currency: string;
  net: string;
}

// Reverses the *net* ledger effect of a transaction as a brand-new balanced
// journal — the original journals are never edited or deleted. Netting across
// all of the transaction's journals (rather than reversing one journal_id)
// keeps refunds correct even when a transaction posts more than one journal
// (e.g. reserve + settle).
//
// Atomic + idempotent: the status transition delivered -> refunded is claimed
// with a single guarded UPDATE inside the same transaction that posts the
// reversal. Concurrent callers race on that UPDATE; only the one that flips the
// row from 'delivered' proceeds, so a transaction can never be refunded twice
// and a mid-way crash rolls back the whole unit.
export async function refundTransaction(txnId: string, adminActor: string): Promise<{ journalId: string }> {
  const { journalId, userId } = await withTransaction(async (client) => {
    const claim = await client.query<{ status: string }>(
      `UPDATE transactions
         SET status = 'refunded', updated_at = now()
       WHERE id = $1 AND status = 'delivered'
       RETURNING user_id, status`,
      [txnId]
    );

    if (claim.rowCount === 0) {
      // Either it doesn't exist or it isn't in a refundable state (already
      // refunded / failed / still pending). Report the actual status.
      const { rows } = await client.query<{ status: string }>(
        `SELECT status FROM transactions WHERE id = $1`,
        [txnId]
      );
      if (rows.length === 0) throw new Error("Transaction not found");
      throw new TransactionNotRefundableError(rows[0].status);
    }
    const claimedUserId = (claim.rows[0] as unknown as { user_id: string }).user_id;

    const { rows: nets } = await client.query<NetEntryRow>(
      `SELECT e.account_id, e.currency, SUM(e.amount_minor)::bigint AS net
         FROM ledger_entries e
         JOIN journals j ON j.id = e.journal_id
        WHERE j.txn_id = $1
        GROUP BY e.account_id, e.currency
       HAVING SUM(e.amount_minor) <> 0`,
      [txnId]
    );

    if (nets.length === 0) {
      // A delivered transaction with no net ledger effect is a data-integrity
      // problem — fail loudly rather than silently "refund" nothing.
      throw new Error(`Transaction ${txnId} has no ledger entries to reverse`);
    }

    const { journalId } = await postJournal(
      {
        txnId,
        journalType: "refund",
        description: `Refund of txn ${txnId}`,
        entries: nets.map((n) => ({
          accountId: n.account_id,
          amountMinor: -Number(n.net),
          currency: n.currency,
        })),
      },
      client as never
    );

    await client.query(
      `INSERT INTO transaction_events (txn_id, from_status, to_status, detail)
       VALUES ($1, 'delivered', 'refunded', $2)`,
      [txnId, JSON.stringify({ reversalJournalId: journalId, admin: adminActor })]
    );

    return { journalId, userId: claimedUserId };
  });

  await logAudit(adminActor, "refund", "transaction", txnId, { reversalJournalId: journalId, userId });
  return { journalId };
}
