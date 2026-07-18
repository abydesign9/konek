import { describe, it, expect, vi, beforeEach } from "vitest";
import type { InflowVerifyResult } from "@/vendors/dollarAccount/types";

let verifyResult: InflowVerifyResult;
let existingInflow = false;
let vaExists = true;
const postJournalMock = vi.fn(async (input: { entries: { accountId: string; amountMinor: number; currency: string }[] }) => {
  void input;
  return { journalId: "j1" };
});

vi.mock("@/lib/idempotency", () => ({ withIdempotency: (_k: string, _p: unknown, fn: () => Promise<unknown>) => fn() }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => {}) }));
vi.mock("@/lib/notifications/send", () => ({ sendNotification: vi.fn(async () => {}) }));
vi.mock("@/lib/ledger/accounts", () => ({
  getUserWalletAccount: vi.fn(async () => "usd-wallet"),
  getOrCreateAccount: vi.fn(async () => "usd-gateway"),
}));
vi.mock("@/lib/ledger/postJournal", () => ({ postJournal: (...a: unknown[]) => postJournalMock(a[0] as never) }));
vi.mock("@/vendors/dollarAccount/mockFincra", () => ({
  mockFincraAdapter: { id: "mock_fincra", verifyInflow: async () => verifyResult },
}));
vi.mock("@/lib/db", () => ({
  query: async (sql: string) => {
    if (sql.includes("FROM virtual_account_inflows WHERE provider_ref")) return { rows: existingInflow ? [{ id: "x" }] : [] };
    if (sql.includes("FROM virtual_accounts WHERE provider_ref")) return { rows: vaExists ? [{ id: "va1", user_id: "u1" }] : [] };
    return { rows: [] };
  },
  withTransaction: async (fn: (c: unknown) => unknown) =>
    fn({
      query: async (sql: string) => {
        if (sql.includes("INSERT INTO transactions")) return { rows: [{ id: "txn1" }] };
        if (sql.includes("INSERT INTO virtual_account_inflows")) return { rows: [{ id: "inf1" }] };
        return { rows: [] };
      },
    }),
}));

const { creditDollarInflow } = await import("./dollarAccountService");

const received = (over: Partial<InflowVerifyResult> = {}): InflowVerifyResult => ({
  status: "received",
  accountProviderRef: "fincra_u1_123",
  amountMinor: 50000,
  currency: "USD",
  senderName: "Jane",
  senderBank: "Chase",
  ...over,
});

describe("creditDollarInflow", () => {
  beforeEach(() => {
    existingInflow = false;
    vaExists = true;
    postJournalMock.mockClear();
  });

  it("credits the VERIFIED amount (never the webhook payload)", async () => {
    verifyResult = received({ amountMinor: 50000 });
    await creditDollarInflow("ref1");
    expect(postJournalMock).toHaveBeenCalledTimes(1);
    const entries = postJournalMock.mock.calls[0][0].entries;
    const walletLeg = entries.find((e) => e.accountId === "usd-wallet")!;
    expect(walletLeg.amountMinor).toBe(50000);
    expect(walletLeg.currency).toBe("USD");
    // balanced against the gateway leg
    expect(entries.find((e) => e.accountId === "usd-gateway")!.amountMinor).toBe(-50000);
  });

  it("is a no-op when the inflow was already credited", async () => {
    existingInflow = true;
    verifyResult = received();
    await creditDollarInflow("ref1");
    expect(postJournalMock).not.toHaveBeenCalled();
  });

  it("does not credit when the provider does not confirm 'received'", async () => {
    verifyResult = received({ status: "not_found" });
    await creditDollarInflow("ref1");
    expect(postJournalMock).not.toHaveBeenCalled();
  });

  it("does not credit when the account is unknown", async () => {
    vaExists = false;
    verifyResult = received();
    await creditDollarInflow("ref1");
    expect(postJournalMock).not.toHaveBeenCalled();
  });
});
