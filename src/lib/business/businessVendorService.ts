import { query } from "@/lib/db";
import { withIdempotency } from "@/lib/idempotency";
import { getBusinessWalletAccount, getPlatformAccount } from "@/lib/ledger/accounts";
import { postJournal } from "@/lib/ledger/postJournal";
import { getBalance } from "@/lib/ledger/balance";
import { isWalletInsufficientError } from "@/lib/ledger/reservations";
import { decryptPii, encryptPii, type EncryptedEnvelope } from "@/lib/crypto/pii";
import { getPayoutProvider } from "@/lib/payout/provider";
import { findBank } from "@/lib/payout/banks";
import { logAudit } from "@/lib/audit";
import { notifyIfLowBalance } from "@/lib/business/businessAlerts";

const CURRENCY = "NGN"; // vendor payouts settle over the same NGN payout rail as personal withdrawals

function vendorAad(businessId: string): string {
  return `vendor:${businessId}`;
}

export class InvalidBankDetailsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBankDetailsError";
  }
}

export class VendorNotFoundError extends Error {
  constructor() {
    super("Vendor not found");
    this.name = "VendorNotFoundError";
  }
}

export class DuplicateVendorError extends Error {
  constructor() {
    super("You already have a vendor saved with this bank and account number");
    this.name = "DuplicateVendorError";
  }
}

export class InsufficientBusinessBalanceError extends Error {
  constructor() {
    super("Insufficient business wallet balance");
    this.name = "InsufficientBusinessBalanceError";
  }
}

export interface Vendor {
  id: string;
  name: string;
  bank_code: string;
  bank_name: string;
  account_name: string;
  account_number_last4: string;
}

export async function listVendors(businessId: string): Promise<Vendor[]> {
  const { rows } = await query<Vendor>(
    `SELECT id, name, bank_code, bank_name, account_name, account_number_last4
     FROM business_vendors WHERE business_account_id = $1 ORDER BY created_at DESC`,
    [businessId]
  );
  return rows;
}

// Add a saved vendor payee — resolves the account name with the payout
// provider first, same verification step as a personal linked bank account.
export async function addVendor(
  businessId: string,
  actorUserId: string,
  input: { name: string; bankCode: string; accountNumber: string }
): Promise<{ id: string }> {
  const bank = findBank(input.bankCode);
  if (!bank) throw new InvalidBankDetailsError("Choose a valid bank");
  if (!/^\d{10}$/.test(input.accountNumber)) throw new InvalidBankDetailsError("Enter a valid 10-digit account number");

  const resolved = await getPayoutProvider().resolveAccount(bank.code, input.accountNumber);
  if (!resolved) throw new InvalidBankDetailsError("Could not verify that account. Check the number and bank.");

  const last4 = input.accountNumber.slice(-4);
  const encrypted = JSON.stringify(encryptPii(input.accountNumber, vendorAad(businessId)));

  let rows;
  try {
    ({ rows } = await query<{ id: string }>(
      `INSERT INTO business_vendors (business_account_id, created_by, name, bank_code, bank_name, account_name, account_number_encrypted, account_number_last4)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8) RETURNING id`,
      [businessId, actorUserId, input.name.trim().slice(0, 120), bank.code, bank.name, resolved.accountName, encrypted, last4]
    ));
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code: string }).code === "23505") {
      throw new DuplicateVendorError();
    }
    throw err;
  }
  await logAudit(actorUserId, "vendor_added", "vendor", rows[0].id, { businessId, bankCode: bank.code, last4 });
  return { id: rows[0].id };
}

export interface VendorTransferResult {
  transferId: string;
  status: "delivered" | "pending" | "failed";
}

// Pay a saved vendor out of the business's own wallet balance. Reserve/settle/
// release directly against the business ledger account (mirrors withdrawService's
// pattern) rather than reusing the personal `reservations` table, which is
// keyed to a single user_id.
export async function sendVendorTransfer(
  businessId: string,
  actorUserId: string,
  input: { vendorId: string; amountMinor: number; idempotencyKey: string }
): Promise<VendorTransferResult> {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new InvalidBankDetailsError("Enter a valid amount");
  }

  return withIdempotency(
    `vendor_transfer:${businessId}:${input.idempotencyKey}`,
    { ...input },
    async () => {
      const { rows: vendorRows } = await query<{
        bank_code: string;
        bank_name: string;
        account_name: string;
        account_number_encrypted: unknown;
        account_number_last4: string;
      }>(
        `SELECT bank_code, bank_name, account_name, account_number_encrypted, account_number_last4
         FROM business_vendors WHERE id = $1 AND business_account_id = $2`,
        [input.vendorId, businessId]
      );
      const vendor = vendorRows[0];
      if (!vendor) throw new VendorNotFoundError();

      const walletAccountId = await getBusinessWalletAccount(businessId, CURRENCY);
      const reserveAccountId = await getPlatformAccount(CURRENCY, "reserve");

      const balance = await getBalance(walletAccountId);
      if (balance < input.amountMinor) throw new InsufficientBusinessBalanceError();

      const { rows: transferRows } = await query<{ id: string }>(
        `INSERT INTO business_vendor_transfers (business_account_id, vendor_id, initiated_by, idempotency_key, amount_minor, currency, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'initiated') RETURNING id`,
        [businessId, input.vendorId, actorUserId, input.idempotencyKey, input.amountMinor, CURRENCY]
      );
      const transferId = transferRows[0].id;

      try {
        await postJournal({
          journalType: "reservation",
          description: "Reservation for vendor transfer",
          entries: [
            { accountId: walletAccountId, amountMinor: -input.amountMinor, currency: CURRENCY },
            { accountId: reserveAccountId, amountMinor: input.amountMinor, currency: CURRENCY },
          ],
        });
      } catch (err) {
        if (isWalletInsufficientError(err)) {
          await query(`UPDATE business_vendor_transfers SET status = 'failed', failure_reason = 'insufficient_balance', updated_at = now() WHERE id = $1`, [transferId]);
          throw new InsufficientBusinessBalanceError();
        }
        throw err;
      }

      await query(`UPDATE business_vendor_transfers SET status = 'pending_vendor', updated_at = now() WHERE id = $1`, [transferId]);

      const accountNumber = decryptPii(vendor.account_number_encrypted as EncryptedEnvelope, vendorAad(businessId));

      let result;
      try {
        result = await getPayoutProvider().sendPayout({
          reference: transferId,
          bankCode: vendor.bank_code,
          accountNumber,
          accountName: vendor.account_name,
          amountMinor: input.amountMinor,
          currency: CURRENCY,
        });
      } catch (err) {
        // Provider threw — release the hold back to the wallet.
        await postJournal({
          journalType: "release",
          description: "Vendor transfer release (provider error)",
          entries: [
            { accountId: reserveAccountId, amountMinor: -input.amountMinor, currency: CURRENCY },
            { accountId: walletAccountId, amountMinor: input.amountMinor, currency: CURRENCY },
          ],
        });
        await query(`UPDATE business_vendor_transfers SET status = 'failed', failure_reason = 'provider_error', updated_at = now() WHERE id = $1`, [transferId]);
        throw err;
      }

      if (result.status === "failed") {
        await postJournal({
          journalType: "release",
          description: "Vendor transfer release (declined)",
          entries: [
            { accountId: reserveAccountId, amountMinor: -input.amountMinor, currency: CURRENCY },
            { accountId: walletAccountId, amountMinor: input.amountMinor, currency: CURRENCY },
          ],
        });
        await query(
          `UPDATE business_vendor_transfers SET status = 'failed', vendor_ref = $2, failure_reason = $3, updated_at = now() WHERE id = $1`,
          [transferId, result.vendorRef, result.reason ?? "declined"]
        );
        return { transferId, status: "failed" as const };
      }

      if (result.status === "pending") {
        await query(`UPDATE business_vendor_transfers SET vendor_ref = $2, updated_at = now() WHERE id = $1`, [transferId, result.vendorRef]);
        return { transferId, status: "pending" as const };
      }

      // paid: settle the hold (reserve -> vendor float) and mark delivered.
      const vendorFloatId = await getPlatformAccount(CURRENCY, "float");
      await postJournal({
        journalType: "settlement",
        description: "Vendor transfer settled",
        entries: [
          { accountId: reserveAccountId, amountMinor: -input.amountMinor, currency: CURRENCY },
          { accountId: vendorFloatId, amountMinor: input.amountMinor, currency: CURRENCY },
        ],
      });
      await query(`UPDATE business_vendor_transfers SET status = 'delivered', vendor_ref = $2, updated_at = now() WHERE id = $1`, [transferId, result.vendorRef]);
      await query(
        `INSERT INTO business_wallet_events (business_account_id, actor_user_id, kind, amount_minor, currency, description, ref)
         VALUES ($1, $2, 'vendor_transfer', $3, $4, $5, $6)`,
        [
          businessId,
          actorUserId,
          input.amountMinor,
          CURRENCY,
          `Sent to ${vendor.account_name} (${vendor.bank_name} ••••${vendor.account_number_last4})`,
          JSON.stringify({ vendorId: input.vendorId, transferId }),
        ]
      );
      await logAudit(actorUserId, "vendor_transfer_paid", "business_vendor_transfer", transferId, { businessId, amountMinor: input.amountMinor });
      await notifyIfLowBalance(businessId, CURRENCY).catch(() => {});

      return { transferId, status: "delivered" as const };
    }
  );
}

export async function listVendorTransfers(businessId: string) {
  const { rows } = await query(
    `SELECT t.id, t.amount_minor, t.currency, t.status, t.vendor_ref, t.created_at,
            v.name AS vendor_name, v.bank_name, v.account_number_last4
     FROM business_vendor_transfers t
     JOIN business_vendors v ON v.id = t.vendor_id
     WHERE t.business_account_id = $1
     ORDER BY t.created_at DESC
     LIMIT 50`,
    [businessId]
  );
  return rows;
}
