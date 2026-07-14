import { query } from "@/lib/db";
import { postJournal } from "@/lib/ledger/postJournal";
import { getOrCreateAccount, getUserWalletAccount } from "@/lib/ledger/accounts";
import { getBalance } from "@/lib/ledger/balance";
import { logAudit } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications/send";
import { mockSudoAdapter } from "@/vendors/cards/mockSudo";
import { CardIssuerAdapter } from "@/vendors/cards/types";

const CURRENCY = "USD";
const DISPUTE_FEE_PCT = 0.2; // ~20% deterrent fee per spec, to discourage friendly fraud
const adapter: CardIssuerAdapter = mockSudoAdapter;

export class NoDollarAccountError extends Error {
  constructor() {
    super("A virtual dollar account is required before a card can be issued");
    this.name = "NoDollarAccountError";
  }
}

export class CardNotActiveError extends Error {
  constructor() {
    super("This card is not active");
    this.name = "CardNotActiveError";
  }
}

export async function issueCard(userId: string): Promise<{ cardId: string }> {
  const { rows: vaRows } = await query<{ id: string }>(`SELECT id FROM virtual_accounts WHERE user_id = $1`, [userId]);
  if (!vaRows[0]) throw new NoDollarAccountError();

  const issued = await adapter.issueCard(userId);

  const { rows } = await query<{ id: string }>(
    `INSERT INTO cards (user_id, provider, provider_card_id, brand, last4, currency)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [userId, adapter.id, issued.providerCardId, issued.brand, issued.last4, CURRENCY]
  );
  await logAudit(userId, "card_issued", "card", rows[0].id, { brand: issued.brand, last4: issued.last4 });
  return { cardId: rows[0].id };
}

export async function setCardFrozen(cardId: string, userId: string, frozen: boolean): Promise<void> {
  await query(`UPDATE cards SET status = $3 WHERE id = $1 AND user_id = $2`, [
    cardId,
    userId,
    frozen ? "frozen" : "active",
  ]);
  await logAudit(userId, frozen ? "card_frozen" : "card_unfrozen", "card", cardId);
}

// Step 1 of every card purchase — never moves money. Always returns a 3DS
// challenge; there is no code path that settles a transaction without one.
export async function authorizeCardPurchase(
  cardId: string,
  userId: string,
  amountMinor: number,
  merchantName: string
): Promise<{ cardTransactionId: string; threeDsChallengeId: string }> {
  const { rows: cardRows } = await query<{ provider_card_id: string; status: string }>(
    `SELECT provider_card_id, status FROM cards WHERE id = $1 AND user_id = $2`,
    [cardId, userId]
  );
  const card = cardRows[0];
  if (!card || card.status !== "active") throw new CardNotActiveError();

  const auth = await adapter.authorize(card.provider_card_id, amountMinor, merchantName);

  const { rows } = await query<{ id: string }>(
    `INSERT INTO card_transactions (card_id, provider_ref, merchant_name, amount_minor, currency, status, three_ds_challenge)
     VALUES ($1, $2, $3, $4, $5, 'authorized', true) RETURNING id`,
    [cardId, auth.providerRef, merchantName, amountMinor, CURRENCY]
  );

  return { cardTransactionId: rows[0].id, threeDsChallengeId: auth.threeDsChallengeId };
}

// Step 2 — the only place money can move. A failed 3DS challenge declines
// the transaction outright; nothing is charged.
export async function completeThreeDsAndSettle(
  cardTransactionId: string,
  userId: string,
  threeDsChallengeId: string,
  code: string
): Promise<{ status: "settled" | "declined"; declineReason?: string }> {
  const { rows: txnRows } = await query<{
    id: string;
    card_id: string;
    amount_minor: string;
    currency: string;
    status: string;
  }>(`SELECT ct.id, ct.card_id, ct.amount_minor, ct.currency, ct.status FROM card_transactions ct WHERE ct.id = $1`, [
    cardTransactionId,
  ]);
  const txn = txnRows[0];
  if (!txn || txn.status !== "authorized") {
    return { status: "declined", declineReason: "not_authorized" };
  }

  const threeDs = await adapter.completeThreeDs(threeDsChallengeId, code);

  if (!threeDs.passed) {
    await query(
      `UPDATE card_transactions SET status = 'declined', decline_reason = '3ds_failed', three_ds_passed = false WHERE id = $1`,
      [cardTransactionId]
    );
    return { status: "declined", declineReason: "3ds_failed" };
  }

  const amountMinor = Number(txn.amount_minor);
  const walletAccountId = await getUserWalletAccount(userId, txn.currency);
  const balance = await getBalance(walletAccountId);

  if (balance < amountMinor) {
    await query(
      `UPDATE card_transactions SET status = 'declined', decline_reason = 'insufficient_balance', three_ds_passed = true WHERE id = $1`,
      [cardTransactionId]
    );
    return { status: "declined", declineReason: "insufficient_balance" };
  }

  const { rows: mainTxnRows } = await query<{ id: string }>(
    `INSERT INTO transactions (user_id, idempotency_key, type, status, currency, amount_minor, recipient)
     VALUES ($1, $2, 'card_purchase', 'delivered', $3, $4, $5) RETURNING id`,
    [userId, `card_purchase:${cardTransactionId}`, txn.currency, amountMinor, JSON.stringify({ cardTransactionId })]
  );
  const mainTxnId = mainTxnRows[0].id;

  const revenueAccountId = await getOrCreateAccount("platform", null, txn.currency, "revenue");
  const { journalId } = await postJournal({
    txnId: mainTxnId,
    description: "Card purchase settlement",
    entries: [
      { accountId: walletAccountId, amountMinor: -amountMinor, currency: txn.currency },
      { accountId: revenueAccountId, amountMinor: amountMinor, currency: txn.currency },
    ],
  });
  await query(`UPDATE transactions SET journal_id = $2 WHERE id = $1`, [mainTxnId, journalId]);

  await query(
    `UPDATE card_transactions SET status = 'settled', three_ds_passed = true, txn_id = $2 WHERE id = $1`,
    [cardTransactionId, mainTxnId]
  );

  await logAudit(userId, "card_purchase_settled", "card_transaction", cardTransactionId, { amountMinor, journalId });
  await sendNotification(
    userId,
    "push",
    "txn_receipt",
    "Card purchase",
    `$${(amountMinor / 100).toLocaleString()} at the merchant was approved.`
  );

  return { status: "settled" };
}

export async function fileDispute(cardTransactionId: string, userId: string, reason: string): Promise<{ disputeId: string; feeMinor: number }> {
  const { rows: txnRows } = await query<{ id: string; amount_minor: string; currency: string; card_id: string }>(
    `SELECT ct.id, ct.amount_minor, ct.currency, ct.card_id FROM card_transactions ct
     JOIN cards c ON c.id = ct.card_id
     WHERE ct.id = $1 AND c.user_id = $2 AND ct.status = 'settled'`,
    [cardTransactionId, userId]
  );
  const txn = txnRows[0];
  if (!txn) throw new Error("Transaction not found or not eligible for dispute");

  const feeMinor = Math.round(Number(txn.amount_minor) * DISPUTE_FEE_PCT);

  const { rows: disputeRows } = await query<{ id: string }>(
    `INSERT INTO card_disputes (card_transaction_id, user_id, reason, dispute_fee_minor, status)
     VALUES ($1, $2, $3, $4, 'filed') RETURNING id`,
    [cardTransactionId, userId, reason, feeMinor]
  );

  const walletAccountId = await getUserWalletAccount(userId, txn.currency);
  const revenueAccountId = await getOrCreateAccount("platform", null, txn.currency, "revenue");
  await postJournal({
    description: `Dispute filing fee for card transaction ${cardTransactionId}`,
    entries: [
      { accountId: walletAccountId, amountMinor: -feeMinor, currency: txn.currency },
      { accountId: revenueAccountId, amountMinor: feeMinor, currency: txn.currency },
    ],
  });

  await logAudit(userId, "card_dispute_filed", "card_dispute", disputeRows[0].id, { feeMinor });
  return { disputeId: disputeRows[0].id, feeMinor };
}
