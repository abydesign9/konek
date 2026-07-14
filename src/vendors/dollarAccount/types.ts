export interface CreateAccountResult {
  providerRef: string;
  accountNumber: string;
  routingNumber: string;
  bankName: string;
}

export interface InflowVerifyResult {
  status: "received" | "not_found";
  accountProviderRef: string;
  amountMinor: number;
  currency: string;
  senderName: string;
  senderBank: string;
}

// Partner holds the money-transmission license — we only integrate. This
// account is receive-only: no outbound transfers to third parties, payout
// only to the user's own verified NGN bank account (enforced at the
// product layer, not here — this adapter has no send() method at all).
export interface DollarAccountAdapter {
  id: string;
  createAccount(userId: string): Promise<CreateAccountResult>;
  // inflowRef identifies one inflow event, distinct from the account's own
  // providerRef — an account can receive many inflows over its lifetime.
  verifyInflow(inflowRef: string): Promise<InflowVerifyResult>;
}
