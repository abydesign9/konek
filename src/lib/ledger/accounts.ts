import { query } from "@/lib/db";

export async function getOrCreateAccount(
  ownerType: "user" | "platform" | "vendor" | "business",
  ownerId: string | null,
  currency: string,
  kind: string
): Promise<string> {
  const existing = await query<{ id: string }>(
    `SELECT id FROM ledger_accounts WHERE owner_type = $1 AND owner_id IS NOT DISTINCT FROM $2 AND currency = $3 AND kind = $4`,
    [ownerType, ownerId, currency, kind]
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const created = await query<{ id: string }>(
    `INSERT INTO ledger_accounts (owner_type, owner_id, currency, kind) VALUES ($1, $2, $3, $4) RETURNING id`,
    [ownerType, ownerId, currency, kind]
  );
  return created.rows[0].id;
}

export async function getUserWalletAccount(userId: string, currency: string): Promise<string> {
  return getOrCreateAccount("user", userId, currency, "wallet");
}

export async function getPlatformAccount(currency: string, kind: string): Promise<string> {
  return getOrCreateAccount("platform", null, currency, kind);
}

// A business account's own wallet — a ledger completely separate from the
// owner's personal wallet (owner_type = 'business').
export async function getBusinessWalletAccount(businessId: string, currency: string): Promise<string> {
  return getOrCreateAccount("business", businessId, currency, "wallet");
}
