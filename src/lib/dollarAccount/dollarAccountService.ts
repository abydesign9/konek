import { query } from "@/lib/db";
import { postJournal } from "@/lib/ledger/postJournal";
import { getOrCreateAccount, getUserWalletAccount } from "@/lib/ledger/accounts";
import { logAudit } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications/send";
import { mockFincraAdapter } from "@/vendors/dollarAccount/mockFincra";
import { DollarAccountAdapter } from "@/vendors/dollarAccount/types";

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

export async function createDollarAccount(userId: string): Promise<{ virtualAccountId: string }> {
  const { rows: userRows } = await query<{ kyc_tier: number }>(`SELECT kyc_tier FROM users WHERE id = $1`, [userId]);
  if ((userRows[0]?.kyc_tier ?? 0) < REQUIRED_KYC_TIER) throw new KycTierTooLowError();

  const { rows: existing } = await query<{ id: string }>(
    `SELECT id FROM virtual_accounts WHERE user_id = $1`,
    [userId]
  );
  if (existing[0]) throw new AlreadyHasAccountError();

  const account = await adapter.createAccount(userId);

  const { rows } = await query<{ id: string }>(
    `INSERT INTO virtual_accounts (user_id, provider, provider_ref, currency, account_number, routing_number, bank_name, kyc_tier_required)
     VALUES ($1, $2, $3, 'USD', $4, $5, $6, $7) RETURNING id`,
    [userId, adapter.id, account.providerRef, account.accountNumber, account.routingNumber, account.bankName, REQUIRED_KYC_TIER]
  );
  await logAudit(userId, "dollar_account_created", "virtual_account", rows[0].id);
  return { virtualAccountId: rows[0].id };
}

// Called from the webhook handler once a signature has verified. Re-fetches
// the authoritative inflow details from the provider — never trusts the
// webhook payload — then credits the user's USD wallet exactly once per
// inflowRef, same idempotent-credit pattern as Paystack wallet funding.
export async function creditDollarInflow(inflowRef: string): Promise<void> {
  const { rows: existingInflow } = await query<{ id: string }>(
    `SELECT id FROM virtual_account_inflows WHERE provider_ref = $1`,
    [inflowRef]
  );
  if (existingInflow[0]) return; // already processed — replay-safe no-op

  const verified = await adapter.verifyInflow(inflowRef);
  if (verified.status !== "received") return;

  const { rows: vaRows } = await query<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM virtual_accounts WHERE provider_ref = $1`,
    [verified.accountProviderRef]
  );
  const virtualAccount = vaRows[0];
  if (!virtualAccount) return;

  const walletAccountId = await getUserWalletAccount(virtualAccount.user_id, "USD");
  const gatewayAccountId = await getOrCreateAccount("platform", null, "USD", "gateway");

  const { rows: txnRows } = await query<{ id: string }>(
    `INSERT INTO transactions (user_id, idempotency_key, type, status, currency, amount_minor, recipient)
     VALUES ($1, $2, 'dollar_inflow', 'delivered', 'USD', $3, $4) RETURNING id`,
    [
      virtualAccount.user_id,
      `dollar_inflow:${inflowRef}`,
      verified.amountMinor,
      JSON.stringify({ senderName: verified.senderName, senderBank: verified.senderBank }),
    ]
  );
  const txnId = txnRows[0].id;

  const { journalId } = await postJournal({
    txnId,
    description: "USD virtual account inflow",
    entries: [
      { accountId: gatewayAccountId, amountMinor: -verified.amountMinor, currency: "USD" },
      { accountId: walletAccountId, amountMinor: verified.amountMinor, currency: "USD" },
    ],
  });
  await query(`UPDATE transactions SET journal_id = $2 WHERE id = $1`, [txnId, journalId]);
  await query(
    `INSERT INTO transaction_events (txn_id, from_status, to_status, detail) VALUES ($1, NULL, 'delivered', $2)`,
    [txnId, JSON.stringify({ journalId, inflowRef })]
  );

  const { rows: inflowRows } = await query<{ id: string }>(
    `INSERT INTO virtual_account_inflows (virtual_account_id, txn_id, sender_name, sender_bank, amount_minor, currency, provider_ref, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'credited') RETURNING id`,
    [virtualAccount.id, txnId, verified.senderName, verified.senderBank, verified.amountMinor, verified.currency, inflowRef]
  );

  await logAudit(virtualAccount.user_id, "dollar_inflow_credited", "virtual_account_inflow", inflowRows[0].id, {
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
}
