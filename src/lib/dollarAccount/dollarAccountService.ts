import { query, withTransaction } from "@/lib/db";
import { withIdempotency } from "@/lib/idempotency";
import { postJournal } from "@/lib/ledger/postJournal";
import { getOrCreateAccount, getUserWalletAccount } from "@/lib/ledger/accounts";
import { logAudit } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications/send";
import { recordDeposit } from "@/lib/promotions/promotionsService";
import { mockFincraAdapter } from "@/vendors/dollarAccount/mockFincra";
import { DollarAccountAdapter } from "@/vendors/dollarAccount/types";
import { tryCreditBusinessInflow } from "@/lib/business/businessAccountService";

const REQUIRED_KYC_TIER = 2;
const adapter: DollarAccountAdapter = mockFincraAdapter;

export class KycTierTooLowError extends Error {
  constructor() {
    super(`A dollar account requires KYC tier ${REQUIRED_KYC_TIER} (liveness-verified)`);
    this.name = "KycTierTooLowError";
  }
}

export class AlreadyHasAccountError extends Error {
  constructor() {
    super("This account already has a dollar account");
    this.name = "AlreadyHasAccountError";
  }
}

export async function createGlobalAccount(
  userId: string,
  currency: "USD" | "GBP" | "EUR"
): Promise<{ virtualAccountId: string }> {
  const { rows: userRows } = await query<{ kyc_tier: number }>(`SELECT kyc_tier FROM users WHERE id = $1`, [userId]);
  if ((userRows[0]?.kyc_tier ?? 0) < REQUIRED_KYC_TIER) throw new KycTierTooLowError();

  const { rows: existing } = await query<{ id: string }>(
    `SELECT id FROM virtual_accounts WHERE user_id = $1 AND currency = $2`,
    [userId, currency]
  );
  if (existing[0]) throw new AlreadyHasAccountError();

  const account = await adapter.createAccount(userId);

  const { rows } = await query<{ id: string }>(
    `INSERT INTO virtual_accounts (user_id, provider, provider_ref, currency, account_number, routing_number, bank_name, kyc_tier_required)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      userId,
      adapter.id,
      account.providerRef,
      currency,
      account.accountNumber,
      account.routingNumber,
      account.bankName,
      REQUIRED_KYC_TIER
    ]
  );
  await logAudit(userId, "dollar_account_created", "virtual_account", rows[0].id);
  return { virtualAccountId: rows[0].id };
}

// Called from the webhook handler once a signature has verified. Re-fetches
// the authoritative inflow details from the provider — never trusts the
// webhook payload — then credits the user's USD wallet exactly once per
// inflowRef, same idempotent-credit pattern as Paystack wallet funding.
export async function creditDollarInflow(inflowRef: string): Promise<void> {
  // Idempotent by the inflow reference: duplicate webhook deliveries (or a
  // replay racing a live delivery) credit at most once. The DB backstops this
  // with a UNIQUE index on virtual_account_inflows.provider_ref (migration 0029)
  // and the transactions (user_id, idempotency_key) constraint.
  await withIdempotency(`dollar_inflow:${inflowRef}`, { inflowRef }, async () => {
    const { rows: existingInflow } = await query<{ id: string }>(
      `SELECT id FROM virtual_account_inflows WHERE provider_ref = $1`,
      [inflowRef]
    );
    if (existingInflow[0]) return { alreadyCredited: true };

    // Never trust the webhook payload — re-fetch the authoritative inflow.
    const verified = await adapter.verifyInflow(inflowRef);
    if (verified.status !== "received") return { skipped: verified.status };

    const { rows: vaRows } = await query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM virtual_accounts WHERE provider_ref = $1`,
      [verified.accountProviderRef]
    );
    const virtualAccount = vaRows[0];
    if (!virtualAccount) {
      // Not a personal account — try a business one before giving up (same
      // provider reference space, one webhook serves both).
      const creditedBusiness = await tryCreditBusinessInflow("USD", verified.accountProviderRef, verified, inflowRef);
      return { unknownAccount: !creditedBusiness, creditedBusiness };
    }

    const walletAccountId = await getUserWalletAccount(virtualAccount.user_id, "USD");
    const gatewayAccountId = await getOrCreateAccount("platform", null, "USD", "gateway");

    // The credit (transaction + journal + inflow record) is one atomic unit, so
    // a mid-way crash can never leave the wallet credited without an inflow row.
    const { journalId, inflowId } = await withTransaction(async (client) => {
      const txnRes = await client.query(
        `INSERT INTO transactions (user_id, idempotency_key, type, status, currency, amount_minor, recipient)
         VALUES ($1, $2, 'dollar_inflow', 'delivered', 'USD', $3, $4) RETURNING id`,
        [
          virtualAccount.user_id,
          `dollar_inflow:${inflowRef}`,
          verified.amountMinor,
          JSON.stringify({ senderName: verified.senderName, senderBank: verified.senderBank }),
        ]
      );
      const txnId = (txnRes.rows[0] as { id: string }).id;

      const posted = await postJournal(
        {
          txnId,
          journalType: "funding",
          description: "USD virtual account inflow",
          entries: [
            { accountId: gatewayAccountId, amountMinor: -verified.amountMinor, currency: "USD" },
            { accountId: walletAccountId, amountMinor: verified.amountMinor, currency: "USD" },
          ],
        },
        client as never
      );
      await client.query(`UPDATE transactions SET journal_id = $2 WHERE id = $1`, [txnId, posted.journalId]);
      await client.query(
        `INSERT INTO transaction_events (txn_id, from_status, to_status, detail) VALUES ($1, NULL, 'delivered', $2)`,
        [txnId, JSON.stringify({ journalId: posted.journalId, inflowRef })]
      );
      const inflowRes = await client.query(
        `INSERT INTO virtual_account_inflows (virtual_account_id, txn_id, sender_name, sender_bank, amount_minor, currency, provider_ref, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'credited') RETURNING id`,
        [virtualAccount.id, txnId, verified.senderName, verified.senderBank, verified.amountMinor, verified.currency, inflowRef]
      );
      return { journalId: posted.journalId, inflowId: (inflowRes.rows[0] as { id: string }).id };
    });

    // Best-effort side effects — never fail (or re-fail) a committed credit.
    try {
      await logAudit(virtualAccount.user_id, "dollar_inflow_credited", "virtual_account_inflow", inflowId, {
        amountMinor: verified.amountMinor,
        journalId,
      });
      await sendNotification(
        virtualAccount.user_id,
        "push",
        "txn_receipt",
        "Dollar account credited",
        `$${(verified.amountMinor / 100).toLocaleString()} received from ${verified.senderName}.`
      );
      // Virtual-account inflow counts as a deposit for promos (grants VA-activation
      // promos + progresses deposit-based unlocks).
      await recordDeposit(virtualAccount.user_id, verified.amountMinor, "USD", "va_inflow");
    } catch {
      // credit is committed; notification/audit hiccups must not mark the webhook failed
    }

    return { credited: true, journalId };
  });
}
