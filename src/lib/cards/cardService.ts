import { query, withTransaction } from "@/lib/db";
import { postJournal } from "@/lib/ledger/postJournal";
import { getOrCreateAccount, getUserWalletAccount } from "@/lib/ledger/accounts";
import { getBalance } from "@/lib/ledger/balance";
import { isWalletInsufficientError } from "@/lib/ledger/reservations";
import { logAudit } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications/send";
import { cashbackOnCardSpend, recordSpend as recordPromoSpend } from "@/lib/promotions/promotionsService";
import { getFinancialConfig } from "@/lib/config/financialConfig";
import { mockSudoAdapter } from "@/vendors/cards/mockSudo";
import { CardIssuerAdapter, SensitiveCardDetails } from "@/vendors/cards/types";

const CURRENCY = "USD";
const DISPUTE_FEE_PCT = 0.2; // ~20% deterrent fee per spec, to discourage friendly fraud
const adapter: CardIssuerAdapter = mockSudoAdapter;

export class NoDollarAccountError extends Error {
  constructor() {
    super("A virtual dollar account is required before a card can be issued");
    this.name = "NoDollarAccountError";
  }
}

export class CardCreationFeeUnpaidError extends Error {
  constructor(readonly feeMinor: number) {
    super("Insufficient wallet balance to cover the card creation fee");
    this.name = "CardCreationFeeUnpaidError";
  }
}

export class CardNotActiveError extends Error {
  constructor() {
    super("This card is not active");
    this.name = "CardNotActiveError";
  }
}

// A card control (merchant lock or spend limit) declined the authorization
// before any 3DS challenge or money movement. `reason` maps to the
// card_transactions.decline_reason value recorded for the attempt.
export class CardDeclinedError extends Error {
  constructor(readonly reason: "merchant_locked" | "single_txn_limit" | "monthly_limit", message: string) {
    super(message);
    this.name = "CardDeclinedError";
  }
}

export interface CardControls {
  singleTxnLimitMinor?: number | null;
  monthlyLimitMinor?: number | null;
  merchantLock?: string | null;
}

// Set/clear spend limits and merchant lock. Only fields provided are changed.
export async function setCardControls(cardId: string, userId: string, controls: CardControls): Promise<void> {
  const sets: string[] = [];
  const vals: unknown[] = [cardId, userId];
  if ("singleTxnLimitMinor" in controls) {
    vals.push(controls.singleTxnLimitMinor ?? null);
    sets.push(`single_txn_limit_minor = $${vals.length}`);
  }
  if ("monthlyLimitMinor" in controls) {
    vals.push(controls.monthlyLimitMinor ?? null);
    sets.push(`monthly_limit_minor = $${vals.length}`);
  }
  if ("merchantLock" in controls) {
    const lock = controls.merchantLock?.trim() || null;
    vals.push(lock);
    sets.push(`merchant_lock = $${vals.length}`);
  }
  if (sets.length === 0) return;
  await query(`UPDATE cards SET ${sets.join(", ")} WHERE id = $1 AND user_id = $2`, vals);
  await logAudit(userId, "card_controls_updated", "card", cardId, controls as Record<string, unknown>);
}

// Reveal full card details. Fetched from the issuer on demand — never stored.
export async function revealCardDetails(cardId: string, userId: string): Promise<SensitiveCardDetails> {
  const { rows } = await query<{ provider_card_id: string; status: string }>(
    `SELECT provider_card_id, status FROM cards WHERE id = $1 AND user_id = $2`,
    [cardId, userId]
  );
  const card = rows[0];
  if (!card) throw new CardNotActiveError();
  const details = await adapter.getSensitiveDetails(card.provider_card_id);
  await logAudit(userId, "card_details_revealed", "card", cardId);
  return details;
}

export async function issueCard(userId: string): Promise<{ cardId: string }> {
  const { rows: vaRows } = await query<{ id: string }>(`SELECT id FROM virtual_accounts WHERE user_id = $1`, [userId]);
  if (!vaRows[0]) throw new NoDollarAccountError();

  // Admin-configurable card creation fee (default 0). Charged from the wallet to
  // platform revenue before issuing; if the wallet can't cover it, we don't issue.
  const feeMinor = (await getFinancialConfig()).cardCreationFeeMinorUSD;
  if (feeMinor > 0) {
    const walletAccountId = await getUserWalletAccount(userId, CURRENCY);
    if ((await getBalance(walletAccountId)) < feeMinor) throw new CardCreationFeeUnpaidError(feeMinor);
    const revenueAccountId = await getOrCreateAccount("platform", null, CURRENCY, "revenue");
    await postJournal({
      journalType: "purchase",
      description: "Card creation fee",
      entries: [
        { accountId: walletAccountId, amountMinor: -feeMinor, currency: CURRENCY },
        { accountId: revenueAccountId, amountMinor: feeMinor, currency: CURRENCY },
      ],
    });
  }

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
  const { rows: cardRows } = await query<{
    provider_card_id: string;
    status: string;
    single_txn_limit_minor: string | null;
    monthly_limit_minor: string | null;
    merchant_lock: string | null;
  }>(
    `SELECT provider_card_id, status, single_txn_limit_minor, monthly_limit_minor, merchant_lock
     FROM cards WHERE id = $1 AND user_id = $2`,
    [cardId, userId]
  );
  const card = cardRows[0];
  if (!card || card.status !== "active") throw new CardNotActiveError();

  // Card controls are enforced before the 3DS challenge — a blocked attempt
  // is recorded as a declined card_transaction (so it shows in history) and
  // the user is notified, then the caller gets a decline.
  async function decline(reason: "merchant_locked" | "single_txn_limit" | "monthly_limit", message: string) {
    await query(
      `INSERT INTO card_transactions (card_id, provider_ref, merchant_name, amount_minor, currency, status, decline_reason, three_ds_challenge)
       VALUES ($1, $2, $3, $4, $5, 'declined', $6, false)`,
      [cardId, `blocked_${reason}`, merchantName, amountMinor, CURRENCY, reason]
    );
    await logAudit(userId, "card_purchase_declined", "card", cardId, { reason, amountMinor, merchantName });
    await sendNotification(userId, "push", "txn_receipt", "Card purchase declined", `${message} ($${(amountMinor / 100).toLocaleString()} at ${merchantName}).`);
    throw new CardDeclinedError(reason, message);
  }

  if (card.merchant_lock && card.merchant_lock.toLowerCase() !== merchantName.toLowerCase()) {
    await decline("merchant_locked", `This card is locked to ${card.merchant_lock}`);
  }
  if (card.single_txn_limit_minor != null && amountMinor > Number(card.single_txn_limit_minor)) {
    await decline("single_txn_limit", `Over the per-transaction limit of $${(Number(card.single_txn_limit_minor) / 100).toLocaleString()}`);
  }
  if (card.monthly_limit_minor != null) {
    const { rows: spentRows } = await query<{ spent: string | null }>(
      `SELECT SUM(amount_minor) AS spent FROM card_transactions
       WHERE card_id = $1 AND status = 'settled' AND created_at >= date_trunc('month', now())`,
      [cardId]
    );
    const spent = spentRows[0]?.spent ? Number(spentRows[0].spent) : 0;
    if (spent + amountMinor > Number(card.monthly_limit_minor)) {
      await decline("monthly_limit", `Over the monthly limit of $${(Number(card.monthly_limit_minor) / 100).toLocaleString()}`);
    }
  }

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
// Internal signal: a concurrent settle already claimed this transaction.
class AlreadyClaimedSignal extends Error {}

export async function completeThreeDsAndSettle(
  cardTransactionId: string,
  userId: string,
  threeDsChallengeId: string,
  code: string
): Promise<{ status: "settled" | "declined"; declineReason?: string }> {
  // Ownership-scoped: a card transaction can only be settled by the user who
  // owns the card (fixes the IDOR where any user could settle any txn id).
  const { rows: txnRows } = await query<{
    id: string;
    card_id: string;
    amount_minor: string;
    currency: string;
    status: string;
  }>(
    `SELECT ct.id, ct.card_id, ct.amount_minor, ct.currency, ct.status
       FROM card_transactions ct JOIN cards c ON c.id = ct.card_id
      WHERE ct.id = $1 AND c.user_id = $2`,
    [cardTransactionId, userId]
  );
  const txn = txnRows[0];
  if (!txn) return { status: "declined", declineReason: "not_authorized" };
  if (txn.status === "settled") return { status: "settled" }; // idempotent retry
  if (txn.status !== "authorized") return { status: "declined", declineReason: "not_authorized" };

  const threeDs = await adapter.completeThreeDs(threeDsChallengeId, code);
  if (!threeDs.passed) {
    await query(
      `UPDATE card_transactions SET status = 'declined', decline_reason = '3ds_failed', three_ds_passed = false WHERE id = $1 AND status = 'authorized'`,
      [cardTransactionId]
    );
    return { status: "declined", declineReason: "3ds_failed" };
  }

  const amountMinor = Number(txn.amount_minor);
  const walletAccountId = await getUserWalletAccount(userId, txn.currency);
  const balance = await getBalance(walletAccountId);
  if (balance < amountMinor) {
    await query(
      `UPDATE card_transactions SET status = 'declined', decline_reason = 'insufficient_balance', three_ds_passed = true WHERE id = $1 AND status = 'authorized'`,
      [cardTransactionId]
    );
    return { status: "declined", declineReason: "insufficient_balance" };
  }

  // A card purchase moves the user's funds to the issuer settlement float (to
  // pay the merchant) — NOT platform revenue. The platform's earnings are
  // interchange/fees, booked separately, never the purchase principal.
  const issuerFloatId = await getOrCreateAccount("vendor", null, txn.currency, "float");

  let journalId = "";
  try {
    await withTransaction(async (client) => {
      // Atomic claim: only the first concurrent settle flips authorized→settled.
      const claim = await client.query(
        `UPDATE card_transactions SET status = 'settled', three_ds_passed = true WHERE id = $1 AND status = 'authorized' RETURNING id`,
        [cardTransactionId]
      );
      if (claim.rowCount === 0) throw new AlreadyClaimedSignal();

      const mainRes = await client.query(
        `INSERT INTO transactions (user_id, idempotency_key, type, status, currency, amount_minor, recipient)
         VALUES ($1, $2, 'card_purchase', 'delivered', $3, $4, $5) RETURNING id`,
        [userId, `card_purchase:${cardTransactionId}`, txn.currency, amountMinor, JSON.stringify({ cardTransactionId })]
      );
      const mainTxnId = (mainRes.rows[0] as { id: string }).id;

      const posted = await postJournal(
        {
          txnId: mainTxnId,
          journalType: "purchase",
          description: "Card purchase settlement",
          entries: [
            { accountId: walletAccountId, amountMinor: -amountMinor, currency: txn.currency },
            { accountId: issuerFloatId, amountMinor: amountMinor, currency: txn.currency },
          ],
        },
        client as never
      );
      journalId = posted.journalId;
      await client.query(`UPDATE transactions SET journal_id = $2 WHERE id = $1`, [mainTxnId, journalId]);
      await client.query(`UPDATE card_transactions SET txn_id = $2 WHERE id = $1`, [cardTransactionId, mainTxnId]);
    });
  } catch (err) {
    if (err instanceof AlreadyClaimedSignal) return { status: "settled" }; // another request settled it
    if (isWalletInsufficientError(err)) {
      // Lost a balance race after the pre-check; the whole settle rolled back.
      await query(
        `UPDATE card_transactions SET status = 'declined', decline_reason = 'insufficient_balance', three_ds_passed = true WHERE id = $1 AND status = 'authorized'`,
        [cardTransactionId]
      );
      return { status: "declined", declineReason: "insufficient_balance" };
    }
    throw err;
  }

  try {
    await logAudit(userId, "card_purchase_settled", "card_transaction", cardTransactionId, { amountMinor, journalId });
    await sendNotification(
      userId,
      "push",
      "txn_receipt",
      "Card purchase",
      `$${(amountMinor / 100).toLocaleString()} at the merchant was approved.`
    );
    // Card spend feeds promos: pay any active cashback, and count it toward
    // unlock thresholds.
    await cashbackOnCardSpend(userId, amountMinor, txn.currency);
    await recordPromoSpend(userId, amountMinor, txn.currency, "card_spend");
  } catch {
    // settlement is committed; notification/audit hiccups must not undo it
  }

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
  const walletAccountId = await getUserWalletAccount(userId, txn.currency);
  const revenueAccountId = await getOrCreateAccount("platform", null, txn.currency, "revenue");

  let disputeId: string;
  try {
    disputeId = await withTransaction(async (client) => {
      // At most one open dispute per card transaction — otherwise a user could
      // file the ~20% fee repeatedly. Backed by a partial unique index (0030).
      const existing = await client.query(
        `SELECT 1 FROM card_disputes WHERE card_transaction_id = $1 AND status IN ('filed','under_review')`,
        [cardTransactionId]
      );
      if ((existing.rowCount ?? 0) > 0) throw new DuplicateDisputeSignal();

      const dRes = await client.query(
        `INSERT INTO card_disputes (card_transaction_id, user_id, reason, dispute_fee_minor, status)
         VALUES ($1, $2, $3, $4, 'filed') RETURNING id`,
        [cardTransactionId, userId, reason, feeMinor]
      );
      // The deterrent fee is genuine platform revenue (unlike a purchase principal).
      await postJournal(
        {
          journalType: "adjustment",
          description: `Dispute filing fee for card transaction ${cardTransactionId}`,
          entries: [
            { accountId: walletAccountId, amountMinor: -feeMinor, currency: txn.currency },
            { accountId: revenueAccountId, amountMinor: feeMinor, currency: txn.currency },
          ],
        },
        client as never
      );
      return (dRes.rows[0] as { id: string }).id;
    });
  } catch (err) {
    if (err instanceof DuplicateDisputeSignal) throw new Error("A dispute is already open for this transaction");
    if (isWalletInsufficientError(err)) throw new Error("Insufficient balance for the dispute fee");
    throw err;
  }

  await logAudit(userId, "card_dispute_filed", "card_dispute", disputeId, { feeMinor });
  return { disputeId, feeMinor };
}

// Internal signal: an open dispute already exists for this transaction.
class DuplicateDisputeSignal extends Error {}
