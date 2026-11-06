import { query, withTransaction } from "@/lib/db";
import { getOrCreateAccount, getBusinessWalletAccount } from "@/lib/ledger/accounts";
import { postJournal } from "@/lib/ledger/postJournal";
import { logAudit } from "@/lib/audit";
import { mockFincraAdapter } from "@/vendors/dollarAccount/mockFincra";
import type { DollarAccountAdapter } from "@/vendors/dollarAccount/types";
import { ngnAccountAdapter } from "@/vendors/ngnAccount";

// Common shape between DollarAccountAdapter's InflowVerifyResult and
// NgnAccountAdapter's NgnInflowVerifyResult — all this function reads.
interface VerifiedInflow {
  amountMinor: number;
  senderName: string;
  senderBank: string;
}

const dollarAdapter: DollarAccountAdapter = mockFincraAdapter;

export interface BusinessVirtualAccount {
  id: string;
  currency: "NGN" | "USD";
  account_number: string;
  routing_number: string | null;
  bank_name: string | null;
  status: string;
}

export class AlreadyHasBusinessAccountError extends Error {
  constructor() {
    super("This business already has an account in this currency");
    this.name = "AlreadyHasBusinessAccountError";
  }
}

export async function listBusinessVirtualAccounts(businessId: string): Promise<BusinessVirtualAccount[]> {
  const { rows } = await query<BusinessVirtualAccount>(
    `SELECT id, currency, account_number, routing_number, bank_name, status
     FROM business_virtual_accounts WHERE business_account_id = $1 ORDER BY currency`,
    [businessId]
  );
  return rows;
}

async function assertNoExistingAccount(businessId: string, currency: string): Promise<void> {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM business_virtual_accounts WHERE business_account_id = $1 AND currency = $2`,
    [businessId, currency]
  );
  if (rows[0]) throw new AlreadyHasBusinessAccountError();
}

// Dedicated USD receiving account for the business, same mock Fincra adapter
// personal dollar accounts use.
export async function createBusinessDollarAccount(businessId: string, actorUserId: string): Promise<{ id: string }> {
  await assertNoExistingAccount(businessId, "USD");
  const account = await dollarAdapter.createAccount(businessId);
  const { rows } = await query<{ id: string }>(
    `INSERT INTO business_virtual_accounts (business_account_id, provider, provider_ref, currency, account_number, routing_number, bank_name)
     VALUES ($1, $2, $3, 'USD', $4, $5, $6) RETURNING id`,
    [businessId, dollarAdapter.id, account.providerRef, account.accountNumber, account.routingNumber, account.bankName]
  );
  await logAudit(actorUserId, "business_dollar_account_created", "business_virtual_account", rows[0].id, { businessId });
  return { id: rows[0].id };
}

// Dedicated NGN receiving account, same mock Monnify (or configured) adapter
// personal Naira accounts use. The provider needs a contact email — the
// business owner's, since the business itself has none on file.
export async function createBusinessNairaAccount(businessId: string, legalName: string, actorUserId: string): Promise<{ id: string }> {
  await assertNoExistingAccount(businessId, "NGN");
  const { rows: ownerRows } = await query<{ email: string | null }>(
    `SELECT u.email FROM business_accounts b JOIN users u ON u.id = b.owner_user_id WHERE b.id = $1`,
    [businessId]
  );
  const adapter = ngnAccountAdapter();
  const account = await adapter.createAccount({
    userId: businessId,
    name: legalName,
    email: ownerRows[0]?.email ?? `${businessId}@raviion.app`,
  });
  const { rows } = await query<{ id: string }>(
    `INSERT INTO business_virtual_accounts (business_account_id, provider, provider_ref, currency, account_number, bank_name)
     VALUES ($1, $2, $3, 'NGN', $4, $5) RETURNING id`,
    [businessId, adapter.id, account.providerRef, account.accountNumber, account.bankName]
  );
  await logAudit(actorUserId, "business_naira_account_created", "business_virtual_account", rows[0].id, { businessId });
  return { id: rows[0].id };
}

// Called from the personal dollar/naira inflow handlers when the provider
// reference doesn't match a personal virtual_accounts row — the fallback path
// that lets one webhook serve both personal and business accounts without
// touching the hardened personal crediting logic. Never trusts the caller's
// data beyond what it already verified with the provider.
export async function tryCreditBusinessInflow(
  currency: "NGN" | "USD",
  accountProviderRef: string,
  verified: VerifiedInflow,
  inflowRef: string
): Promise<boolean> {
  const { rows } = await query<{ id: string; business_account_id: string }>(
    `SELECT id, business_account_id FROM business_virtual_accounts WHERE provider_ref = $1 AND currency = $2`,
    [accountProviderRef, currency]
  );
  const va = rows[0];
  if (!va) return false;

  const { rows: existingInflow } = await query<{ id: string }>(
    `SELECT id FROM business_virtual_account_inflows WHERE provider_ref = $1`,
    [inflowRef]
  );
  if (existingInflow[0]) return true; // already credited

  const walletAccountId = await getBusinessWalletAccount(va.business_account_id, currency);
  const gatewayAccountId = await getOrCreateAccount("platform", null, currency, "gateway");

  await withTransaction(async (client) => {
    const posted = await postJournal(
      {
        journalType: "funding",
        description: `${currency} business virtual account inflow`,
        entries: [
          { accountId: gatewayAccountId, amountMinor: -verified.amountMinor, currency },
          { accountId: walletAccountId, amountMinor: verified.amountMinor, currency },
        ],
      },
      client as never
    );
    await client.query(
      `INSERT INTO business_virtual_account_inflows (business_virtual_account_id, sender_name, sender_bank, amount_minor, currency, provider_ref)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [va.id, verified.senderName, verified.senderBank, verified.amountMinor, currency, inflowRef]
    );
    await client.query(
      `INSERT INTO business_wallet_events (business_account_id, kind, amount_minor, currency, description, ref)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        va.business_account_id,
        currency === "USD" ? "dollar_inflow" : "naira_inflow",
        verified.amountMinor,
        currency,
        `Received from ${verified.senderName ?? "external transfer"}`,
        JSON.stringify({ journalId: posted.journalId, senderBank: verified.senderBank }),
      ]
    );
  });

  // Unattended provider-driven credit — no user acted, so the actor is a
  // system sentinel rather than the business id (which would misleadingly
  // read as a user/admin identifier in the audit trail).
  await logAudit("system", "business_inflow_credited", "business_virtual_account", va.id, {
    businessId: va.business_account_id,
    amountMinor: verified.amountMinor,
    currency,
  });
  return true;
}

