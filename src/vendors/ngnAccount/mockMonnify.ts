import { CreateNgnAccountResult, NgnAccountAdapter, NgnInflowVerifyResult } from "./types";

// In-memory stand-in for Monnify, same "re-fetch, never trust the webhook
// payload" pattern as the other mock providers. Inflows are keyed by a
// per-inflow reference and hung off globalThis so the mock-inflow route and the
// webhook route (separate bundles) share the same store in dev.
const globalStore = globalThis as unknown as { __konekMockNgnInflows?: Map<string, NgnInflowVerifyResult> };
const inflows = (globalStore.__konekMockNgnInflows ??= new Map<string, NgnInflowVerifyResult>());

export function registerMockNgnInflow(inflowRef: string, result: NgnInflowVerifyResult) {
  inflows.set(inflowRef, result);
}

function randomDigits(n: number): string {
  let out = "";
  for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10);
  return out;
}

export const mockMonnifyAdapter: NgnAccountAdapter = {
  id: "mock_monnify",

  async createAccount({ userId }): Promise<CreateNgnAccountResult> {
    return {
      providerRef: `monnify_${userId}_${randomDigits(6)}`,
      accountNumber: `9${randomDigits(9)}`,
      bankName: "Wema Bank (Mock)",
    };
  },

  async verifyInflow(inflowRef: string): Promise<NgnInflowVerifyResult> {
    return (
      inflows.get(inflowRef) ?? {
        status: "not_found",
        accountProviderRef: "",
        amountMinor: 0,
        senderName: "",
        senderBank: "",
      }
    );
  },
};
