import { query } from "@/lib/db";
import { withIdempotency } from "@/lib/idempotency";
import { postJournal } from "@/lib/ledger/postJournal";
import { getPlatformAccount, getUserWalletAccount } from "@/lib/ledger/accounts";
import { getBalance } from "@/lib/ledger/balance";
import {
  InsufficientBalanceError,
  isWalletInsufficientError,
  releaseReservation,
  settleReservation,
} from "@/lib/ledger/reservations";
import { checkVelocityLimits } from "@/lib/limits/checkLimits";

// Re-exported so existing importers keep working; the class now lives with the
// reservation ledger logic that raises it.
export { InsufficientBalanceError } from "@/lib/ledger/reservations";
import { awardPurchaseCoins, awardReferralBonusIfEligible } from "@/lib/rewards/awardCoins";
import { logAudit } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications/send";
import { sendExternalAlert } from "@/lib/alerts/externalAlert";
import { recordCommissionIfAgent } from "@/lib/agents/agentService";
import { updateStreak } from "@/lib/gamification/streaks";
import { computeAndUpdateLevel } from "@/lib/gamification/levels";
import { checkMissions } from "@/lib/gamification/missions";
import { updateSquadGoalProgress } from "@/lib/gamification/squads";
import { grantMinutesBundle } from "@/lib/voice/voiceService";
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

export async function purchaseVtu(input: PurchaseInput) {
  return withIdempotency(
    `purchase:${input.userId}:${input.idempotencyKey}`,
    { ...input },
    async () => {
      await checkVelocityLimits(input.userId, input.amountMinor, CURRENCY);

      const walletAccountId = await getUserWalletAccount(input.userId, CURRENCY);
      const reserveAccountId = await getPlatformAccount(CURRENCY, "reserve");

      // Cheap pre-check for the common insufficient case, so we don't create a
      // transaction row for it. The authoritative guard against a concurrent
      // double-spend is the DB reservation below (wallet_nonneg trigger).
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

      // RESERVE: debit wallet -> reserve BEFORE calling the vendor. This is the
      // atomic point that serialises concurrent spends — the wallet_nonneg
      // trigger fails any reservation that would overdraw the wallet, so at most
      // one of N concurrent purchases can reserve the same funds.
      let reservationJournalId: string;
      try {
        const reserved = await postJournal({
          txnId,
          journalType: "reservation",
          description: `Reservation for ${input.serviceType}`,
          entries: [
            { accountId: walletAccountId, amountMinor: -input.amountMinor, currency: CURRENCY },
            { accountId: reserveAccountId, amountMinor: input.amountMinor, currency: CURRENCY },
          ],
        });
        reservationJournalId = reserved.journalId;
      } catch (err) {
        if (isWalletInsufficientError(err)) {
          // Lost the concurrent balance race. Mark this transaction failed so it
          // isn't left dangling, then surface the same error the pre-check does.
          await query(
            `UPDATE transactions SET status = 'failed', failure_reason = 'insufficient_balance', updated_at = now() WHERE id = $1`,
            [txnId]
          );
          await query(
            `INSERT INTO transaction_events (txn_id, from_status, to_status, detail) VALUES ($1, 'initiated', 'failed', $2)`,
            [txnId, JSON.stringify({ reason: "insufficient_balance" })]
          );
          throw new InsufficientBalanceError();
        }
        throw err;
      }

      await query(
        `INSERT INTO reservations (txn_id, user_id, wallet_account_id, reserve_account_id, amount_minor, currency, reservation_journal_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [txnId, input.userId, walletAccountId, reserveAccountId, input.amountMinor, CURRENCY, reservationJournalId]
      );

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

      if (result.status === "failed") {
        // RELEASE: vendor declined outright — refund the reservation.
        await releaseReservation(txnId, {
          reason: "vendor_declined",
          vendorRef: result.vendorRef,
          raw: result.raw ?? {},
        });
        await logAudit(input.userId, "purchase_failed", "transaction", txnId, {
          serviceType: input.serviceType,
          vendor: adapter.id,
        });
        await sendExternalAlert("transaction_failed", `${input.serviceType} purchase declined by ${adapter.id}`, {
          txnId,
          vendor: adapter.id,
          amountMinor: input.amountMinor,
        });
        return { txnId, status: "failed" as const };
      }

      if (result.status === "pending") {
        // Async vendor: delivery is NOT yet confirmed. Do NOT release — the
        // vendor may still deliver, and refunding now risks paying for goods the
        // user also received. Keep the funds reserved and the transaction in
        // pending_vendor; persist the vendor ref so the reservation recovery
        // worker (cron) can verify() and settle-or-release once the outcome is
        // known. Settling early would be just as wrong as releasing early.
        await query(
          `UPDATE transactions SET vendor_ref = $2, vendor_response = $3, updated_at = now() WHERE id = $1`,
          [txnId, result.vendorRef, JSON.stringify(result.raw ?? {})]
        );
        await logAudit(input.userId, "purchase_pending", "transaction", txnId, {
          serviceType: input.serviceType,
          vendor: adapter.id,
          vendorRef: result.vendorRef,
        });
        return { txnId, status: "pending" as const, vendorRef: result.vendorRef };
      }

      // SETTLE: reserve -> vendor float, mark delivered. Idempotent (guarded
      // claim), so the recovery worker settling the same reservation is a no-op.
      await settleReservation(txnId, {
        vendorRef: result.vendorRef,
        token: result.token,
        raw: result.raw ?? {},
      });
      await logAudit(input.userId, "purchase_delivered", "transaction", txnId, {
        serviceType: input.serviceType,
        vendor: adapter.id,
        amountMinor: input.amountMinor,
      });

      // Post-delivery side effects are best-effort. The purchase is already
      // delivered and debited; a failure in rewards/gamification/notifications
      // must never bubble out of the idempotency wrapper, because that would
      // delete the key and a same-key retry would re-INSERT the transaction and
      // hit UNIQUE(user_id, idempotency_key) — permanently wedging a completed
      // purchase. So they are isolated and, on failure, alerted for follow-up.
      try {
        await awardPurchaseCoins(input.userId, txnId, input.amountMinor);
        await awardReferralBonusIfEligible(input.userId);
        await recordCommissionIfAgent(input.userId, txnId, input.amountMinor, CURRENCY);
        await updateStreak(input.userId);
        await computeAndUpdateLevel(input.userId);
        await checkMissions(input.userId, input.serviceType);
        await updateSquadGoalProgress(input.userId);
        if (CURRENCY === "NGN" && input.amountMinor >= 200000) {
          await grantMinutesBundle(input.userId, 5, "topup_reward");
        }
        await sendNotification(
          input.userId,
          "push",
          "txn_receipt",
          "Purchase successful",
          `${input.serviceType.replace("_", " ")} for ₦${(input.amountMinor / 100).toLocaleString()} was delivered.`
        );
      } catch (sideEffectErr) {
        await sendExternalAlert(
          "side_effect_failed",
          `post-delivery hooks failed for txn ${txnId}`,
          { txnId, error: sideEffectErr instanceof Error ? sideEffectErr.message : String(sideEffectErr) }
        ).catch(() => {});
      }

      return { txnId, status: "delivered" as const, token: result.token };
    }
  );
}
