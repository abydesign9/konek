import { findBank } from "./banks";

// Payout provider abstraction for withdrawals (money out to the user's own bank).
// Real implementation is Paystack Transfers; it's wired only when PAYSTACK_SECRET_KEY
// is set, otherwise a mock stands in so the whole flow is testable end to end —
// the same "unset key = mock" posture as the VTU/email layers.
export interface AccountResolution {
  accountName: string;
}

export interface PayoutResult {
  // paid: money left immediately (mock/instant). pending: accepted, confirmed
  // later via provider webhook. failed: rejected, no money moved.
  status: "paid" | "pending" | "failed";
  vendorRef: string;
  reason?: string;
}

export interface PayoutParams {
  reference: string; // our transaction id (idempotency key for the provider)
  bankCode: string;
  accountNumber: string;
  accountName: string;
  amountMinor: number;
  currency: string;
}

export interface PayoutProvider {
  id: string;
  resolveAccount(bankCode: string, accountNumber: string): Promise<AccountResolution | null>;
  sendPayout(params: PayoutParams): Promise<PayoutResult>;
}

// Deterministic mock: resolves any 10-digit NUBAN to a placeholder name and
// reports the payout as paid. Lets the ledger reserve/settle path run for real.
const mockPayoutProvider: PayoutProvider = {
  id: "mock_payout",
  async resolveAccount(bankCode, accountNumber) {
    if (!/^\d{10}$/.test(accountNumber) || !findBank(bankCode)) return null;
    return { accountName: "KONEK TEST ACCOUNT" };
  },
  async sendPayout(params) {
    return { status: "paid", vendorRef: `mock_payout_${params.reference}` };
  },
};

export function isPayoutConfigured(): boolean {
  return !!process.env.PAYSTACK_SECRET_KEY;
}

// TODO(payout): real Paystack Transfers provider — createTransferRecipient +
// initiateTransfer, resolveAccount via GET /bank/resolve, confirmation via the
// transfer.success / transfer.failed webhook. Gated on live credentials, same as
// the VTU aggregators. Until then the mock provides a working, safe stand-in.
export function getPayoutProvider(): PayoutProvider {
  // if (isPayoutConfigured()) return paystackPayoutProvider;
  return mockPayoutProvider;
}
