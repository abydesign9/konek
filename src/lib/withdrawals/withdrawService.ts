import { query } from "@/lib/db";
import { withIdempotency } from "@/lib/idempotency";
import { getUserWalletAccount, getPlatformAccount } from "@/lib/ledger/accounts";
import { postJournal } from "@/lib/ledger/postJournal";
import { getBalance } from "@/lib/ledger/balance";
import {
  InsufficientBalanceError,
  isWalletInsufficientError,
  settleReservation,
  releaseReservation,
} from "@/lib/ledger/reservations";
import { checkVelocityLimits } from "@/lib/limits/checkLimits";
import { decryptPii, type EncryptedEnvelope } from "@/lib/crypto/pii";
import { getPayoutProvider } from "@/lib/payout/provider";
import { logAudit } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications/send";

const CURRENCY = "NGN";

function bankAccountAad(userId: string): string {
  return `bank_account:${userId}`;
}

export class BankAccountNotFoundError extends Error {
  constructor() {
    super("Bank account not found");
    this.name = "BankAccountNotFoundError";
  }
}

export interface WithdrawInput {
  userId: string;
  idempotencyKey: string;
  bankAccountId: string;
  amountMinor: number; // NGN kobo
}

export interface WithdrawResult {
  txnId: string;
  status: "delivered" | "pending" | "failed";
}

// Withdraw the user's OWN wallet funds to their OWN linked bank account. Money
// out only — never a transfer to another person. Reuses the reserve/settle/
// release ledger path: funds are held the instant the request is accepted, then
// settled when the payout provider confirms, or released back on failure.
export async function requestWithdrawal(input: WithdrawInput): Promise<WithdrawResult> {
  return withIdempotency(
    `withdraw:${input.userId}:${input.idempotencyKey}`,
    { ...input },
    async () => {
      await checkVelocityLimits(input.userId, input.amountMinor, CURRENCY);

      // The linked account must belong to the requesting user (no withdrawing to
      // someone else's saved account).
      const { rows: acctRows } = await query<{
        bank_code: string;
        bank_name: string;
        account_name: string;
        account_number_encrypted: unknown;
        account_number_last4: string;
      }>(
        `SELECT bank_code, bank_name, account_name, account_number_encrypted, account_number_last4
         FROM bank_accounts WHERE id = $1 AND user_id = $2`,
        [input.bankAccountId, input.userId]
      );
      const acct = acctRows[0];
      if (!acct) throw new BankAccountNotFoundError();

      const walletAccountId = await getUserWalletAccount(input.userId, CURRENCY);
      const reserveAccountId = await getPlatformAccount(CURRENCY, "reserve");

      // Cheap pre-check; the authoritative guard is the reservation trigger below.
      const balance = await getBalance(walletAccountId);
      if (balance < input.amountMinor) throw new InsufficientBalanceError();

      const recipient = {
        bankAccountId: input.bankAccountId,
        bankCode: acct.bank_code,
        bankName: acct.bank_name,
        accountName: acct.account_name,
        accountNumberLast4: acct.account_number_last4,
      };

      const txnRes = await query<{ id: string }>(
        `INSERT INTO transactions (user_id, idempotency_key, type, status, currency, amount_minor, recipient)
         VALUES ($1, $2, 'withdrawal', 'initiated', $3, $4, $5) RETURNING id`,
        [input.userId, input.idempotencyKey, CURRENCY, input.amountMinor, JSON.stringify(recipient)]
      );
      const txnId = txnRes.rows[0].id;

      // RESERVE: hold the funds (wallet -> reserve) before calling the provider.
      // The wallet_nonneg trigger rejects any hold that would overdraw.
      let reservationJournalId: string;
      try {
        const reserved = await postJournal({
          txnId,
          journalType: "reservation",
          description: "Reservation for withdrawal",
          entries: [
            { accountId: walletAccountId, amountMinor: -input.amountMinor, currency: CURRENCY },
            { accountId: reserveAccountId, amountMinor: input.amountMinor, currency: CURRENCY },
          ],
        });
        reservationJournalId = reserved.journalId;
      } catch (err) {
        if (isWalletInsufficientError(err)) {
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

      const provider = getPayoutProvider();
      await query(
        `UPDATE transactions SET vendor = $2, status = 'pending_vendor', updated_at = now() WHERE id = $1`,
        [txnId, provider.id]
      );
      await query(
        `INSERT INTO transaction_events (txn_id, from_status, to_status, detail) VALUES ($1, 'initiated', 'pending_vendor', $2)`,
        [txnId, JSON.stringify({ vendor: provider.id })]
      );

      // Decrypt the destination account number only at the moment of payout.
      const accountNumber = decryptPii(
        acct.account_number_encrypted as EncryptedEnvelope,
        bankAccountAad(input.userId)
      );

      let result;
      try {
        result = await provider.sendPayout({
          reference: txnId,
          bankCode: acct.bank_code,
          accountNumber,
          accountName: acct.account_name,
          amountMinor: input.amountMinor,
          currency: CURRENCY,
        });
      } catch (err) {
        // Provider threw — treat as a failure and return the held funds.
        await releaseReservation(txnId, { reason: "payout_error" });
        throw err;
      }

      if (result.status === "failed") {
        await releaseReservation(txnId, { reason: result.reason ?? "payout_declined", vendorRef: result.vendorRef });
        return { txnId, status: "failed" as const };
      }

      if (result.status === "pending") {
        // Money not yet gone; funds stay held until the provider webhook settles
        // or releases (same recovery path as pending purchases).
        await query(`UPDATE transactions SET vendor_ref = $2, updated_at = now() WHERE id = $1`, [txnId, result.vendorRef]);
        return { txnId, status: "pending" as const };
      }

      // paid: settle the hold (reserve -> vendor float) and mark delivered.
      await settleReservation(txnId, { vendorRef: result.vendorRef });
      await logAudit(input.userId, "withdrawal_paid", "transaction", txnId, {
        amountMinor: input.amountMinor,
        bankAccountId: input.bankAccountId,
      });
      await sendNotification(
        input.userId,
        "push",
        "txn_receipt",
        "Withdrawal sent",
        `₦${(input.amountMinor / 100).toLocaleString()} is on its way to your ${acct.bank_name} account ••••${acct.account_number_last4}.`
      );
      return { txnId, status: "delivered" as const };
    }
  );
}
