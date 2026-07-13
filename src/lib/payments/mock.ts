import { query } from "@/lib/db";
import { InitializeParams, InitializeResult, PaymentGateway, VerifyResult } from "./types";

// Stands in for Paystack until PAYSTACK_SECRET_KEY is live. "Checkout" is a
// local page (/wallet/fund/mock-checkout) that, on approval, fires a
// properly-signed webhook at our real /api/webhooks/paystack endpoint —
// so the signature-verify -> store-raw -> re-fetch-and-credit path is
// exercised exactly as it will be in production.
export const mockPaymentGateway: PaymentGateway = {
  async initialize({ reference, callbackUrl }: InitializeParams): Promise<InitializeResult> {
    return {
      authorizationUrl: `${callbackUrl.replace(/\/wallet\/fund\/success.*/, "")}/wallet/fund/mock-checkout?reference=${reference}`,
      reference,
    };
  },

  async verifyTransaction(reference: string): Promise<VerifyResult> {
    // Re-fetch from our own record of what was authorized — never trust the
    // webhook payload's amount. A real adapter calls GET /transaction/verify/:reference.
    const { rows } = await query<{ amount_minor: string; currency: string; vendor_response: { mock_completed?: boolean } | null }>(
      `SELECT amount_minor, currency, vendor_response FROM transactions WHERE id = $1`,
      [reference]
    );
    const txn = rows[0];
    if (!txn) return { status: "failed", amountMinor: 0, currency: "NGN" };

    const completed = txn.vendor_response?.mock_completed === true;
    return {
      status: completed ? "success" : "pending",
      amountMinor: Number(txn.amount_minor),
      currency: txn.currency,
    };
  },
};
