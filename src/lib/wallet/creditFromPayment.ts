import { query } from "@/lib/db";
import { postJournal } from "@/lib/ledger/postJournal";
import { getPlatformAccount, getUserWalletAccount } from "@/lib/ledger/accounts";
import { withIdempotency } from "@/lib/idempotency";
import { paymentGateway } from "@/lib/payments";
import { logAudit } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications/send";
import { recordDeposit } from "@/lib/promotions/promotionsService";

interface Transaction {
  id: string;
  user_id: string;
  status: string;
  amount_minor: string;
  currency: string;
}

// Called from the webhook handler once a signature has verified. Re-fetches
// the authoritative amount/status from the vendor (never trusts the webhook
// payload), then credits the wallet exactly once per reference.
export async function creditFromPayment(reference: string): Promise<void> {
  const { rows } = await query<Transaction>(`SELECT * FROM transactions WHERE id = $1`, [reference]);
  const txn = rows[0];
  if (!txn) return; // unknown reference — nothing to credit

  if (txn.status === "delivered") return; // already processed, replay-safe no-op

  const verified = await paymentGateway.verifyTransaction(reference);

  if (verified.status !== "success") {
    if (verified.status === "failed") {
      await query(
        `UPDATE transactions SET status = 'failed', updated_at = now() WHERE id = $1`,
        [txn.id]
      );
      await query(
        `INSERT INTO transaction_events (txn_id, from_status, to_status, detail) VALUES ($1, $2, 'failed', $3)`,
        [txn.id, txn.status, JSON.stringify({ reference })]
      );
    }
    return;
  }

  await withIdempotency(`credit_wallet:${reference}`, { reference }, async () => {
    const walletAccountId = await getUserWalletAccount(txn.user_id, verified.currency);
    const gatewayAccountId = await getPlatformAccount(verified.currency, "gateway");

    const { journalId } = await postJournal({
      txnId: txn.id,
      journalType: "funding",
      description: "Wallet funding via Paystack",
      entries: [
        { accountId: gatewayAccountId, amountMinor: -verified.amountMinor, currency: verified.currency },
        { accountId: walletAccountId, amountMinor: verified.amountMinor, currency: verified.currency },
      ],
    });

    await query(
      `UPDATE transactions SET status = 'delivered', journal_id = $2, updated_at = now() WHERE id = $1`,
      [txn.id, journalId]
    );
    await query(
      `INSERT INTO transaction_events (txn_id, from_status, to_status, detail) VALUES ($1, $2, 'delivered', $3)`,
      [txn.id, txn.status, JSON.stringify({ reference, journalId })]
    );
    await logAudit(txn.user_id, "wallet_funded", "transaction", txn.id, {
      amountMinor: verified.amountMinor,
      currency: verified.currency,
      journalId,
    });
    await sendNotification(
      txn.user_id,
      "push",
      "txn_receipt",
      "Wallet funded",
      `₦${(verified.amountMinor / 100).toLocaleString()} was added to your wallet.`
    );

    // Progress any deposit-based promos (first-deposit grant + unlock progress).
    // Non-blocking: a promo error must never affect the funding credit.
    await recordDeposit(txn.user_id, verified.amountMinor, verified.currency, "funding").catch(() => {});

    return { journalId };
  });
}
