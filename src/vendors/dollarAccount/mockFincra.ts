import { CreateAccountResult, DollarAccountAdapter, InflowVerifyResult } from "./types";

// In-memory store standing in for what the real Fincra API would tell us if
// we called GET /inflows/:ref — same "re-fetch, don't trust the webhook
// payload" pattern as the Paystack mock. Keyed by a per-inflow reference,
// distinct from the account's own providerRef, since one account can
// receive many inflows over its lifetime.
const inflows = new Map<string, InflowVerifyResult>();

export function registerMockInflow(inflowRef: string, result: InflowVerifyResult) {
  inflows.set(inflowRef, result);
}

function randomDigits(n: number): string {
  let out = "";
  for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10);
  return out;
}

export const mockFincraAdapter: DollarAccountAdapter = {
  id: "mock_fincra",

  async createAccount(userId: string): Promise<CreateAccountResult> {
    return {
      providerRef: `fincra_${userId}_${randomDigits(6)}`,
      accountNumber: randomDigits(10),
      routingNumber: "026073150", // mock ABA
      bankName: "Fincra Partner Bank (Mock)",
    };
  },

  async verifyInflow(inflowRef: string): Promise<InflowVerifyResult> {
    return (
      inflows.get(inflowRef) ?? {
        status: "not_found",
        accountProviderRef: "",
        amountMinor: 0,
        currency: "USD",
        senderName: "",
        senderBank: "",
      }
    );
  },
};
