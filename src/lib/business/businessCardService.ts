import { query } from "@/lib/db";
import { getOrCreateAccount, getBusinessWalletAccount } from "@/lib/ledger/accounts";
import { getBalance } from "@/lib/ledger/balance";
import { postJournal } from "@/lib/ledger/postJournal";
import { logAudit } from "@/lib/audit";
import { getCardProduct } from "@/lib/cards/cardProducts";
import { mockSudoAdapter } from "@/vendors/cards/mockSudo";
import { CardIssuerAdapter } from "@/vendors/cards/types";
import { notifyIfLowBalance } from "@/lib/business/businessAlerts";

// Same mock issuer personal cards use — swap for the real one in one place
// (src/vendors/cards) once a card-issuer provider is chosen; every caller,
// personal and business, keeps working unchanged.
const adapter: CardIssuerAdapter = mockSudoAdapter;

export class BusinessCardProductUnavailableError extends Error {
  constructor() {
    super("This card product is not available");
    this.name = "BusinessCardProductUnavailableError";
  }
}

export class BusinessCardFeeUnpaidError extends Error {
  constructor(readonly feeMinor: number) {
    super("Insufficient business wallet balance to cover the card creation fee");
    this.name = "BusinessCardFeeUnpaidError";
  }
}

export interface BusinessCard {
  id: string;
  label: string | null;
  brand: string;
  last4: string;
  currency: string;
  status: string;
  created_at: string;
}

export async function listBusinessCards(businessId: string): Promise<BusinessCard[]> {
  const { rows } = await query<BusinessCard>(
    `SELECT id, label, brand, last4, currency, status, created_at
     FROM business_cards WHERE business_account_id = $1 ORDER BY created_at DESC`,
    [businessId]
  );
  return rows;
}

// Issues a card against the business's own wallet (not any team member's
// personal wallet). The creation fee comes straight out of the business
// currency balance — same product catalogue personal cards use.
export async function issueBusinessCard(
  businessId: string,
  actorUserId: string,
  productId: string,
  label?: string
): Promise<{ cardId: string }> {
  const product = await getCardProduct(productId);
  if (!product || !product.active) throw new BusinessCardProductUnavailableError();

  const walletAccountId = await getBusinessWalletAccount(businessId, product.currency);
  const feeMinor = product.creationFeeMinor;
  if (feeMinor > 0) {
    if ((await getBalance(walletAccountId)) < feeMinor) throw new BusinessCardFeeUnpaidError(feeMinor);
    const revenueAccountId = await getOrCreateAccount("platform", null, product.currency, "revenue");
    await postJournal({
      journalType: "purchase",
      description: `Business card creation fee (${product.name})`,
      entries: [
        { accountId: walletAccountId, amountMinor: -feeMinor, currency: product.currency },
        { accountId: revenueAccountId, amountMinor: feeMinor, currency: product.currency },
      ],
    });
    await query(
      `INSERT INTO business_wallet_events (business_account_id, actor_user_id, kind, amount_minor, currency, description)
       VALUES ($1, $2, 'card_fee', $3, $4, $5)`,
      [businessId, actorUserId, feeMinor, product.currency, `Card creation fee (${product.name})`]
    );
    await notifyIfLowBalance(businessId, product.currency).catch(() => {});
  }

  const issued = await adapter.issueCard(businessId);
  const { rows } = await query<{ id: string }>(
    `INSERT INTO business_cards (business_account_id, created_by, label, provider, provider_card_id, card_type, brand, last4, currency)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [businessId, actorUserId, label ?? null, adapter.id, issued.providerCardId, product.formFactor, product.brand, issued.last4, product.currency]
  );
  await logAudit(actorUserId, "business_card_issued", "business_card", rows[0].id, { businessId, product: product.name });
  return { cardId: rows[0].id };
}

async function loadOwnedCard(cardId: string, businessId: string) {
  const { rows } = await query<{ id: string; provider_card_id: string; status: string }>(
    `SELECT id, provider_card_id, status FROM business_cards WHERE id = $1 AND business_account_id = $2`,
    [cardId, businessId]
  );
  return rows[0] ?? null;
}

export async function setBusinessCardFrozen(cardId: string, businessId: string, actorUserId: string, frozen: boolean): Promise<void> {
  const card = await loadOwnedCard(cardId, businessId);
  if (!card) throw new Error("Card not found");
  await query(`UPDATE business_cards SET status = $2 WHERE id = $1`, [cardId, frozen ? "frozen" : "active"]);
  await logAudit(actorUserId, frozen ? "business_card_frozen" : "business_card_unfrozen", "business_card", cardId, { businessId });
}

export async function revealBusinessCardDetails(cardId: string, businessId: string) {
  const card = await loadOwnedCard(cardId, businessId);
  if (!card) throw new Error("Card not found");
  return adapter.getSensitiveDetails(card.provider_card_id);
}
