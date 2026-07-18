import { withTransaction } from "@/lib/db";
import { getOrCreateAccount } from "@/lib/ledger/accounts";
import { postJournal } from "@/lib/ledger/postJournal";
import { logAudit } from "@/lib/audit";

// Raised (via a DB trigger) when a debit would drive a wallet negative.
export class InsufficientBalanceError extends Error {
  constructor() {
    super("Wallet balance is insufficient for this purchase");
    this.name = "InsufficientBalanceError";
  }
}

// The wallet_nonneg trigger raises check_violation (23514) carrying this token.
// A concurrent reservation that loses the balance race surfaces here.
export function isWalletInsufficientError(err: unknown): boolean {
  const e = err as { message?: string } | null;
  return !!e && typeof e.message === "string" && e.message.includes("wallet_insufficient_funds");
}

interface HeldReservation {
  amount_minor: string;
  currency: string;
  wallet_account_id: string;
  reserve_account_id: string;
}

export interface SettleOutcome {
  settled: boolean; // false => was already settled/released (idempotent no-op)
}

// Settlement (vendor success): debit reserve, credit vendor float; mark the
// transaction delivered. Idempotent: the reservation is claimed with a guarded
// UPDATE (held -> settled) inside the same transaction as the journal, so a
// concurrent inline call and cron-recovery call can never both settle.
export async function settleReservation(
  txnId: string,
  vendor: { vendorRef?: string | null; token?: string | null; raw?: unknown }
): Promise<SettleOutcome> {
  const outcome = await withTransaction(async (client) => {
    const claim = await client.query(
      `UPDATE reservations SET status = 'settled', updated_at = now()
        WHERE txn_id = $1 AND status = 'held'
        RETURNING amount_minor, currency, wallet_account_id, reserve_account_id`,
      [txnId]
    );
    if (claim.rowCount === 0) return { settled: false };

    const r = claim.rows[0] as unknown as HeldReservation;
    const amount = Number(r.amount_minor);
    const vendorFloatId = await getOrCreateAccount("vendor", null, r.currency, "float");

    const { journalId } = await postJournal(
      {
        txnId,
        journalType: "settlement",
        description: `Settlement for txn ${txnId}`,
        entries: [
          { accountId: r.reserve_account_id, amountMinor: -amount, currency: r.currency },
          { accountId: vendorFloatId, amountMinor: amount, currency: r.currency },
        ],
      },
      client as never
    );

    await client.query(
      `UPDATE reservations SET settlement_journal_id = $2, updated_at = now() WHERE txn_id = $1`,
      [txnId, journalId]
    );
    await client.query(
      `UPDATE transactions
          SET status = 'delivered', vendor_ref = COALESCE($2, vendor_ref),
              vendor_response = COALESCE($3, vendor_response), token = COALESCE($4, token),
              journal_id = $5, updated_at = now()
        WHERE id = $1 AND status <> 'delivered'`,
      [txnId, vendor.vendorRef ?? null, vendor.raw ? JSON.stringify(vendor.raw) : null, vendor.token ?? null, journalId]
    );
    await client.query(
      `INSERT INTO transaction_events (txn_id, from_status, to_status, detail)
       VALUES ($1, 'pending_vendor', 'delivered', $2)`,
      [txnId, JSON.stringify({ settlementJournalId: journalId, vendorRef: vendor.vendorRef })]
    );
    return { settled: true, journalId };
  });

  if (outcome.settled) {
    await logAudit("system:ledger", "reservation_settled", "transaction", txnId, {
      journalId: (outcome as { journalId?: string }).journalId,
    });
  }
  return { settled: outcome.settled };
}

export interface ReleaseOutcome {
  released: boolean; // false => already settled/released (idempotent no-op)
}

// Release (vendor failure/expiry): debit reserve, credit user wallet; mark the
// transaction failed. Idempotent by the same guarded-claim mechanism.
export async function releaseReservation(
  txnId: string,
  opts: { reason: string; vendorRef?: string | null; raw?: unknown }
): Promise<ReleaseOutcome> {
  const outcome = await withTransaction(async (client) => {
    const claim = await client.query(
      `UPDATE reservations SET status = 'released', updated_at = now()
        WHERE txn_id = $1 AND status = 'held'
        RETURNING amount_minor, currency, wallet_account_id, reserve_account_id`,
      [txnId]
    );
    if (claim.rowCount === 0) return { released: false };

    const r = claim.rows[0] as unknown as HeldReservation;
    const amount = Number(r.amount_minor);

    const { journalId } = await postJournal(
      {
        txnId,
        journalType: "release",
        description: `Release for txn ${txnId} (${opts.reason})`,
        entries: [
          { accountId: r.reserve_account_id, amountMinor: -amount, currency: r.currency },
          { accountId: r.wallet_account_id, amountMinor: amount, currency: r.currency },
        ],
      },
      client as never
    );

    await client.query(
      `UPDATE reservations SET release_journal_id = $2, updated_at = now() WHERE txn_id = $1`,
      [txnId, journalId]
    );
    await client.query(
      `UPDATE transactions
          SET status = 'failed', failure_reason = $2, vendor_ref = COALESCE($3, vendor_ref),
              vendor_response = COALESCE($4, vendor_response), updated_at = now()
        WHERE id = $1 AND status NOT IN ('delivered','failed','refunded')`,
      [txnId, opts.reason, opts.vendorRef ?? null, opts.raw ? JSON.stringify(opts.raw) : null]
    );
    await client.query(
      `INSERT INTO transaction_events (txn_id, from_status, to_status, detail)
       VALUES ($1, 'pending_vendor', 'failed', $2)`,
      [txnId, JSON.stringify({ releaseJournalId: journalId, reason: opts.reason })]
    );
    return { released: true, journalId };
  });

  if (outcome.released) {
    await logAudit("system:ledger", "reservation_released", "transaction", txnId, {
      journalId: (outcome as { journalId?: string }).journalId,
      reason: opts.reason,
    });
  }
  return { released: outcome.released };
}
