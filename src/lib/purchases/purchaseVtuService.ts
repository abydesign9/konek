import { query } from "@/lib/db";
import { withIdempotency } from "@/lib/idempotency";
import { postJournal } from "@/lib/ledger/postJournal";
import { getOrCreateAccount, getUserWalletAccount } from "@/lib/ledger/accounts";
import { getBalance } from "@/lib/ledger/balance";
import { checkVelocityLimits } from "@/lib/limits/checkLimits";
import { awardPurchaseCoins, awardReferralBonusIfEligible } from "@/lib/rewards/awardCoins";
import { logAudit } from "@/lib/audit";
import { selectVendor } from "@/vendors/registry";
import { VendorServiceType } from "@/vendors/types";

const CURRENCY = "NGN";

export interface PurchaseInput {
  userId: string;
  idempotencyKey: string;
  serviceType: VendorServiceType;
  network: string;
  phone: string;
  amountMinor: number; // always NGN — the currency actually settled
  planExternalId?: string;
  recipientExtra?: Record<string, unknown>; // e.g. { displayCurrency: 'USD', displayAmountMinor, meterNo, smartcardNo }
}

export class InsufficientBalanceError extends Error {
  constructor() {
    super("Wallet balance is insufficient for this purchase");
    this.name = "InsufficientBalanceError";
  }
}

export async function purchaseVtu(input: PurchaseInput) {
  return withIdempotency(
    `purchase:${input.userId}:${input.idempotencyKey}`,
    { ...input },
    async () => {
      await checkVelocityLimits(input.userId, input.amountMinor, CURRENCY);

      const walletAccountId = await getUserWalletAccount(input.userId, CURRENCY);
      const balance = await getBalance(walletAccountId);
      if (balance < input.amountMinor) {
        throw new InsufficientBalanceError();
      }

      const txnResult = await query<{ id: string }>(
        `INSERT INTO transactions (user_id, idempotency_key, type, status, currency, amount_minor, recipient)
         VALUES ($1, $2, $3, 'initiated', $4, $5, $6)
         RETURNING id`,
        [
          input.userId,
          input.idempotencyKey,
          input.serviceType,
          CURRENCY,
          input.amountMinor,
          JSON.stringify({
            phone: input.phone,
            network: input.network,
            planExternalId: input.planExternalId,
            ...input.recipientExtra,
          }),
        ]
      );
      const txnId = txnResult.rows[0].id;

      const adapter = await selectVendor(input.serviceType);

      await query(
        `UPDATE transactions SET vendor = $2, status = 'pending_vendor', updated_at = now() WHERE id = $1`,
        [txnId, adapter.id]
      );
      await query(
        `INSERT INTO transaction_events (txn_id, from_status, to_status, detail) VALUES ($1, 'initiated', 'pending_vendor', $2)`,
        [txnId, JSON.stringify({ vendor: adapter.id })]
      );

      const result = await adapter.purchase({
        reference: txnId,
        serviceType: input.serviceType,
        network: input.network,
        phone: input.phone,
        planExternalId: input.planExternalId,
        amountMinor: input.amountMinor,
      });

      if (result.status !== "delivered") {
        await query(
          `UPDATE transactions SET status = 'failed', vendor_ref = $2, vendor_response = $3, failure_reason = $4, updated_at = now() WHERE id = $1`,
          [txnId, result.vendorRef, JSON.stringify(result.raw ?? {}), "vendor_declined"]
        );
        await query(
          `INSERT INTO transaction_events (txn_id, from_status, to_status, detail) VALUES ($1, 'pending_vendor', 'failed', $2)`,
          [txnId, JSON.stringify({ vendorRef: result.vendorRef })]
        );
        await logAudit(input.userId, "purchase_failed", "transaction", txnId, {
          serviceType: input.serviceType,
          vendor: adapter.id,
        });
        return { txnId, status: "failed" as const };
      }

      const vendorFloatAccountId = await getOrCreateAccount("vendor", null, CURRENCY, "float");
      const { journalId } = await postJournal({
        txnId,
        description: `${input.serviceType} purchase via ${adapter.id}`,
        entries: [
          { accountId: walletAccountId, amountMinor: -input.amountMinor, currency: CURRENCY },
          { accountId: vendorFloatAccountId, amountMinor: input.amountMinor, currency: CURRENCY },
        ],
      });

      await query(
        `UPDATE transactions
         SET status = 'delivered', vendor_ref = $2, vendor_response = $3, token = $4, journal_id = $5, updated_at = now()
         WHERE id = $1`,
        [txnId, result.vendorRef, JSON.stringify(result.raw ?? {}), result.token ?? null, journalId]
      );
      await query(
        `INSERT INTO transaction_events (txn_id, from_status, to_status, detail) VALUES ($1, 'pending_vendor', 'delivered', $2)`,
        [txnId, JSON.stringify({ vendorRef: result.vendorRef, journalId })]
      );
      await logAudit(input.userId, "purchase_delivered", "transaction", txnId, {
        serviceType: input.serviceType,
        vendor: adapter.id,
        amountMinor: input.amountMinor,
        journalId,
      });

      await awardPurchaseCoins(input.userId, txnId, input.amountMinor);
      await awardReferralBonusIfEligible(input.userId);

      return { txnId, status: "delivered" as const, token: result.token };
    }
  );
}
