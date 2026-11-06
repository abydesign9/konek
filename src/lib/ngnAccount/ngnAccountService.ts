import { query, withTransaction } from "@/lib/db";
import { withIdempotency } from "@/lib/idempotency";
import { postJournal } from "@/lib/ledger/postJournal";
import { getOrCreateAccount, getUserWalletAccount } from "@/lib/ledger/accounts";
import { logAudit } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications/send";
import { recordDeposit } from "@/lib/promotions/promotionsService";
import { getFinancialConfig } from "@/lib/config/financialConfig";
import { ngnAccountAdapter } from "@/vendors/ngnAccount";
import { tryCreditBusinessInflow } from "@/lib/business/businessAccountService";

// NGN reserved (virtual) account: a real bank account number tied to the user.
// Money sent to it credits the user's NGN wallet, mirroring the USD dollar
// account. Receive-only. The required KYC tier is admin-configurable (financial
// config), defaulting to transact-tier (BVN/NIN).

export class KycTierTooLowError extends Error {
  constructor() {
    super("A Naira account requires identity verification (BVN or NIN)");
    this.name = "KycTierTooLowError";
  }
}
export class AlreadyHasAccountError extends Error {
  constructor() {
    super("You already have a Naira account");
    this.name = "AlreadyHasAccountError";
  }
}

interface NairaAccount {
  id: string;
  accountNumber: string;
  bankName: string | null;
  status: string;
}

export async function getNairaAccount(userId: string): Promise<NairaAccount | null> {
  const { rows } = await query<{ id: string; account_number: string; bank_name: string | null; status: string }>(
    `SELECT id, account_number, bank_name, status FROM virtual_accounts WHERE user_id = $1 AND currency = 'NGN' LIMIT 1`,
    [userId]
  );
  const r = rows[0];
  return r ? { id: r.id, accountNumber: r.account_number, bankName: r.bank_name, status: r.status } : null;
}

// Provision a reserved account for the user. KYC-gated and one-per-user.
export async function createNairaAccount(userId: string): Promise<{ virtualAccountId: string }> {
  const { rows: userRows } = await query<{ kyc_tier: number; full_name: string | null; email: string | null }>(
    `SELECT kyc_tier, full_name, email FROM users WHERE id = $1`,
    [userId]
  );
  const user = userRows[0];
  const requiredTier = (await getFinancialConfig()).nairaAccountKycTier;
  if ((user?.kyc_tier ?? 0) < requiredTier) throw new KycTierTooLowError();

  const { rows: existing } = await query<{ id: string }>(
    `SELECT id FROM virtual_accounts WHERE user_id = $1 AND currency = 'NGN'`,
    [userId]
  );
  if (existing[0]) throw new AlreadyHasAccountError();

  // Production Monnify requires the user's BVN to reserve an account. raviion does
  // not store the raw BVN (PII is encrypted and not recoverable as plaintext by
  // design), so when the live adapter is enabled, capture the BVN at
  // provisioning time and pass it here. The mock reserves without it.
  const adapter = ngnAccountAdapter();
  const account = await adapter.createAccount({
    userId,
    name: user?.full_name ?? "raviion User",
    email: user?.email ?? `${userId}@raviion.app`,
  });

  const { rows } = await query<{ id: string }>(
    `INSERT INTO virtual_accounts (user_id, provider, provider_ref, currency, account_number, routing_number, bank_name, kyc_tier_required)
     VALUES ($1, $2, $3, 'NGN', $4, NULL, $5, $6) RETURNING id`,
    [userId, adapter.id, account.providerRef, account.accountNumber, account.bankName, requiredTier]
  );
  await logAudit(userId, "naira_account_created", "virtual_account", rows[0].id, { provider: adapter.id });
  return { virtualAccountId: rows[0].id };
}

// Called by the Monnify webhook handler once the signature verified. Re-fetches
// the authoritative inflow (never trusts the callback body) and credits the NGN
// wallet exactly once per inflow reference.
export async function creditNgnInflow(inflowRef: string): Promise<void> {
  await withIdempotency(`ngn_inflow:${inflowRef}`, { inflowRef }, async () => {
    const { rows: existingInflow } = await query<{ id: string }>(
      `SELECT id FROM virtual_account_inflows WHERE provider_ref = $1`,
      [inflowRef]
    );
    if (existingInflow[0]) return { alreadyCredited: true };

    const adapter = ngnAccountAdapter();
    const verified = await adapter.verifyInflow(inflowRef);
    if (verified.status !== "received") return { skipped: verified.status };

    const { rows: vaRows } = await query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM virtual_accounts WHERE provider_ref = $1 AND currency = 'NGN'`,
      [verified.accountProviderRef]
    );
    const virtualAccount = vaRows[0];
    if (!virtualAccount) {
      const creditedBusiness = await tryCreditBusinessInflow("NGN", verified.accountProviderRef, verified, inflowRef);
      return { unknownAccount: !creditedBusiness, creditedBusiness };
    }

    const walletAccountId = await getUserWalletAccount(virtualAccount.user_id, "NGN");
    const gatewayAccountId = await getOrCreateAccount("platform", null, "NGN", "gateway");

    const { journalId } = await withTransaction(async (client) => {
      const txnRes = await client.query(
        `INSERT INTO transactions (user_id, idempotency_key, type, status, currency, amount_minor, recipient)
         VALUES ($1, $2, 'va_inflow', 'delivered', 'NGN', $3, $4) RETURNING id`,
        [
          virtualAccount.user_id,
          `ngn_inflow:${inflowRef}`,
          verified.amountMinor,
          JSON.stringify({ senderName: verified.senderName, senderBank: verified.senderBank }),
        ]
      );
      const txnId = (txnRes.rows[0] as { id: string }).id;

      const posted = await postJournal(
        {
          txnId,
          journalType: "funding",
          description: "Naira virtual account inflow",
          entries: [
            { accountId: gatewayAccountId, amountMinor: -verified.amountMinor, currency: "NGN" },
            { accountId: walletAccountId, amountMinor: verified.amountMinor, currency: "NGN" },
          ],
        },
        client as never
      );
      await client.query(`UPDATE transactions SET journal_id = $2 WHERE id = $1`, [txnId, posted.journalId]);
      await client.query(
        `INSERT INTO transaction_events (txn_id, from_status, to_status, detail) VALUES ($1, NULL, 'delivered', $2)`,
        [txnId, JSON.stringify({ journalId: posted.journalId, inflowRef })]
      );
      await client.query(
        `INSERT INTO virtual_account_inflows (virtual_account_id, txn_id, sender_name, sender_bank, amount_minor, currency, provider_ref, status)
         VALUES ($1, $2, $3, $4, $5, 'NGN', $6, 'credited')`,
        [virtualAccount.id, txnId, verified.senderName, verified.senderBank, verified.amountMinor, inflowRef]
      );
      return { journalId: posted.journalId };
    });

    // Best-effort side effects — never fail (or re-fail) a committed credit.
    try {
      await logAudit(virtualAccount.user_id, "naira_inflow_credited", "virtual_account", virtualAccount.id, {
        amountMinor: verified.amountMinor,
        journalId,
      });
      await sendNotification(
        virtualAccount.user_id,
        "push",
        "txn_receipt",
        "Money received",
        `₦${(verified.amountMinor / 100).toLocaleString()} landed in your wallet from ${verified.senderName || "a transfer"}.`
      );
      await recordDeposit(virtualAccount.user_id, verified.amountMinor, "NGN", "va_inflow");
    } catch {
      /* credit is committed; side-effect hiccups must not mark the webhook failed */
    }

    return { credited: true, journalId };
  });
}
