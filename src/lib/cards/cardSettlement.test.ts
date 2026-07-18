import { describe, it, expect, vi, beforeEach } from "vitest";

let cardRow: { id: string; card_id: string; amount_minor: string; currency: string; status: string } | null;
let threeDsPassed = true;
let balance = 1_000_000;
const postJournalMock = vi.fn(async (input: { entries: { accountId: string; amountMinor: number }[] }) => {
  void input;
  return { journalId: "j1" };
});
const getOrCreateAccountMock = vi.fn(async (_o: string, _i: unknown, _c: string, kind: string) => `${kind}-acct`);

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => {}) }));
vi.mock("@/lib/notifications/send", () => ({ sendNotification: vi.fn(async () => {}) }));
vi.mock("@/lib/ledger/postJournal", () => ({ postJournal: (...a: unknown[]) => postJournalMock(a[0] as never) }));
vi.mock("@/lib/ledger/accounts", () => ({
  getUserWalletAccount: vi.fn(async () => "wallet-usd"),
  getOrCreateAccount: (...a: unknown[]) => getOrCreateAccountMock(...(a as [string, unknown, string, string])),
}));
vi.mock("@/lib/ledger/balance", () => ({ getBalance: async () => balance }));
vi.mock("@/vendors/cards/mockSudo", () => ({
  mockSudoAdapter: { id: "mock_sudo", completeThreeDs: async () => ({ passed: threeDsPassed }) },
}));
vi.mock("@/lib/db", () => ({
  query: async (sql: string) => {
    if (sql.includes("FROM card_transactions ct JOIN cards c")) return { rows: cardRow ? [cardRow] : [] };
    return { rows: [] };
  },
  withTransaction: async (fn: (c: unknown) => unknown) =>
    fn({
      query: async (sql: string) => {
        if (sql.includes("UPDATE card_transactions SET status = 'settled'")) return { rowCount: 1, rows: [{ id: "ct1" }] };
        if (sql.includes("INSERT INTO transactions")) return { rows: [{ id: "main1" }] };
        return { rowCount: 1, rows: [] };
      },
    }),
}));

const { completeThreeDsAndSettle } = await import("./cardService");

const authorized = () => ({ id: "ct1", card_id: "c1", amount_minor: "50000", currency: "USD", status: "authorized" });

describe("completeThreeDsAndSettle", () => {
  beforeEach(() => {
    cardRow = authorized();
    threeDsPassed = true;
    balance = 1_000_000;
    postJournalMock.mockClear();
    getOrCreateAccountMock.mockClear();
  });

  it("settles by moving funds to the issuer FLOAT, not platform revenue", async () => {
    const r = await completeThreeDsAndSettle("ct1", "u1", "chal", "123456");
    expect(r.status).toBe("settled");
    // The credit leg goes to a 'float' account, never 'revenue'.
    const kinds = getOrCreateAccountMock.mock.calls.map((c) => c[3]);
    expect(kinds).toContain("float");
    expect(kinds).not.toContain("revenue");
    const entries = postJournalMock.mock.calls[0][0].entries;
    expect(entries.find((e) => e.accountId === "wallet-usd")!.amountMinor).toBe(-50000);
    expect(entries.find((e) => e.accountId === "float-acct")!.amountMinor).toBe(50000);
  });

  it("rejects settling a transaction the user does not own (IDOR)", async () => {
    cardRow = null; // ownership-scoped query finds nothing
    const r = await completeThreeDsAndSettle("ct1", "attacker", "chal", "123456");
    expect(r).toEqual({ status: "declined", declineReason: "not_authorized" });
    expect(postJournalMock).not.toHaveBeenCalled();
  });

  it("is idempotent for an already-settled transaction", async () => {
    cardRow = { ...authorized(), status: "settled" };
    const r = await completeThreeDsAndSettle("ct1", "u1", "chal", "123456");
    expect(r.status).toBe("settled");
    expect(postJournalMock).not.toHaveBeenCalled();
  });

  it("declines on failed 3DS", async () => {
    threeDsPassed = false;
    const r = await completeThreeDsAndSettle("ct1", "u1", "chal", "000000");
    expect(r).toEqual({ status: "declined", declineReason: "3ds_failed" });
    expect(postJournalMock).not.toHaveBeenCalled();
  });

  it("declines on insufficient balance", async () => {
    balance = 100;
    const r = await completeThreeDsAndSettle("ct1", "u1", "chal", "123456");
    expect(r).toEqual({ status: "declined", declineReason: "insufficient_balance" });
    expect(postJournalMock).not.toHaveBeenCalled();
  });
});
