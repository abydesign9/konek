import { query } from "@/lib/db";
import { withIdempotency } from "@/lib/idempotency";
import { postJournal } from "@/lib/ledger/postJournal";
import { getOrCreateAccount, getUserWalletAccount } from "@/lib/ledger/accounts";
import { getBalance } from "@/lib/ledger/balance";
import { getFxRateConfig, usdMinorToNgnMinorUserRate } from "@/lib/fx";
import { logAudit } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications/send";

export class InsufficientUsdBalanceError extends Error {
  constructor() {
    super("Your USD balance is too low for this conversion");
    this.name = "InsufficientUsdBalanceError";
  }
}

// Converts USD wallet -> NGN wallet at the user rate (mid-market minus the FX
// spread). One journal, two currency legs — each balances within its own
// currency (per-currency balancing is enforced by assertBalanced and the DB
// trigger). The spread is Konek's margin, held as the USD it acquires.
export async function convertUsdToNgn(
  userId: string,
  usdMinor: number,
  idempotencyKey: string
): Promise<{ txnId: string; usdMinor: number; ngnMinor: number; rate: number }> {
  if (!Number.isInteger(usdMinor) || usdMinor <= 0) {
    throw new Error("usdMinor must be a positive integer");
  }

  return withIdempotency(
    `fx_convert:${userId}:${idempotencyKey}`,
    { userId, usdMinor },
    async () => {
      const usdWallet = await getUserWalletAccount(userId, "USD");
      const usdBalance = await getBalance(usdWallet);
      if (usdBalance < usdMinor) throw new InsufficientUsdBalanceError();

      const ngnMinor = await usdMinorToNgnMinorUserRate(usdMinor);
      const { ngnPerUsd, usdNgnSpreadPct } = await getFxRateConfig();
      const ngnWallet = await getUserWalletAccount(userId, "NGN");
      const usdReserve = await getOrCreateAccount("platform", null, "USD", "reserve");
      const ngnReserve = await getOrCreateAccount("platform", null, "NGN", "reserve");

      const { rows } = await query<{ id: string }>(
        `INSERT INTO transactions (user_id, idempotency_key, type, status, currency, amount_minor, recipient)
         VALUES ($1, $2, 'fx_convert', 'delivered', 'USD', $3, $4) RETURNING id`,
        [
          userId,
          idempotencyKey,
          usdMinor,
          JSON.stringify({ ngnMinor, rate: ngnPerUsd, spread: usdNgnSpreadPct }),
        ]
      );
      const txnId = rows[0].id;

      const { journalId } = await postJournal({
        txnId,
        description: "USD → NGN conversion",
        entries: [
          // USD leg (nets to 0 in USD)
          { accountId: usdWallet, amountMinor: -usdMinor, currency: "USD" },
          { accountId: usdReserve, amountMinor: usdMinor, currency: "USD" },
          // NGN leg (nets to 0 in NGN)
          { accountId: ngnReserve, amountMinor: -ngnMinor, currency: "NGN" },
          { accountId: ngnWallet, amountMinor: ngnMinor, currency: "NGN" },
        ],
      });

      await query(`UPDATE transactions SET journal_id = $2 WHERE id = $1`, [txnId, journalId]);
      await query(
        `INSERT INTO transaction_events (txn_id, from_status, to_status, detail) VALUES ($1, NULL, 'delivered', $2)`,
        [txnId, JSON.stringify({ journalId, usdMinor, ngnMinor })]
      );
      await logAudit(userId, "fx_convert", "transaction", txnId, { usdMinor, ngnMinor });
      await sendNotification(
        userId,
        "push",
        "txn_receipt",
        "Converted to naira",
        `$${(usdMinor / 100).toLocaleString()} converted to ₦${(ngnMinor / 100).toLocaleString()}.`
      );

      return { txnId, usdMinor, ngnMinor, rate: ngnPerUsd };
    }
  );
}
