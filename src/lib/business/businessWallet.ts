import { query } from "@/lib/db";
import { getBusinessWalletAccount, getUserWalletAccount } from "@/lib/ledger/accounts";
import { getBalance } from "@/lib/ledger/balance";
import { postJournal } from "@/lib/ledger/postJournal";
import { withIdempotency } from "@/lib/idempotency";
import { logAudit } from "@/lib/audit";

// A business account keeps its own wallet ledger, completely separate from the
// owner's personal wallet (owner_type='business'). Businesses hold the same four
// display currencies as personal accounts.
export const BUSINESS_CURRENCIES = ["NGN", "USD", "GBP", "EUR"] as const;
export type BusinessCurrency = (typeof BUSINESS_CURRENCIES)[number];

export interface BusinessBalance {
  currency: BusinessCurrency;
  minor: number;
}

export async function getBusinessBalances(businessId: string): Promise<BusinessBalance[]> {
  return Promise.all(
    BUSINESS_CURRENCIES.map(async (currency) => ({
      currency,
      minor: await getBusinessWalletAccount(businessId, currency).then(getBalance),
    }))
  );
}

export class BusinessFundingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessFundingError";
  }
}

// Move money from the owner's personal wallet into the business wallet — an
// atomic, in-app double-entry transfer (no external provider). The ledger's
// non-negative guard rejects the debit if the owner's wallet is short, so this
// can never overdraw. Idempotent per key so a double-tap can't double-charge.
export async function fundBusinessFromOwner(input: {
  businessId: string;
  ownerUserId: string;
  currency: string;
  amountMinor: number;
  idempotencyKey: string;
}): Promise<{ balanceMinor: number }> {
  const currency = String(input.currency).toUpperCase();
  if (!(BUSINESS_CURRENCIES as readonly string[]).includes(currency)) {
    throw new BusinessFundingError("Unsupported currency");
  }
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new BusinessFundingError("Enter a valid amount");
  }

  await withIdempotency(
    `business_fund:${input.ownerUserId}:${input.idempotencyKey}`,
    { businessId: input.businessId, currency, amountMinor: input.amountMinor },
    async () => {
      const [ownerAccount, businessAccount] = await Promise.all([
        getUserWalletAccount(input.ownerUserId, currency),
        getBusinessWalletAccount(input.businessId, currency),
      ]);
      await postJournal({
        journalType: "transfer",
        description: "Fund business wallet from owner",
        entries: [
          { accountId: ownerAccount, amountMinor: -input.amountMinor, currency },
          { accountId: businessAccount, amountMinor: input.amountMinor, currency },
        ],
      });
      await logAudit(input.ownerUserId, "business_wallet_funded", "business_account", input.businessId, {
        currency,
        amountMinor: input.amountMinor,
      });
    }
  );

  const balanceMinor = await getBusinessWalletAccount(input.businessId, currency).then(getBalance);
  return { balanceMinor };
}

// The owner user id for a business (funding must come from the owner's wallet).
export async function getBusinessOwner(businessId: string): Promise<string | null> {
  const { rows } = await query<{ owner_user_id: string }>(
    `SELECT owner_user_id FROM business_accounts WHERE id = $1`,
    [businessId]
  );
  return rows[0]?.owner_user_id ?? null;
}
