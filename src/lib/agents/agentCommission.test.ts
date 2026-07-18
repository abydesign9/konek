import { describe, it, expect, vi, beforeEach } from "vitest";

let claimRows: { amount_minor: string; currency: string }[] = [];
const postJournalMock = vi.fn(async (input: { entries: { accountId: string; currency: string; amountMinor: number }[] }) => {
  void input;
  return { journalId: "j-" + Math.random().toString(36).slice(2) };
});

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => {}) }));
vi.mock("@/lib/ledger/postJournal", () => ({ postJournal: (...a: unknown[]) => postJournalMock(a[0] as never) }));
vi.mock("@/lib/ledger/accounts", () => ({
  getOrCreateAccount: vi.fn(async (_o: string, _i: unknown, currency: string, kind: string) => `${kind}-${currency}`),
}));
vi.mock("@/lib/db", () => ({
  query: async (sql: string) => {
    if (sql.includes("SELECT user_id FROM agents")) return { rows: [{ user_id: "agent-user" }] };
    return { rows: [] };
  },
  withTransaction: async (fn: (c: unknown) => unknown) =>
    fn({
      query: async (sql: string) => {
        if (sql.includes("UPDATE agent_commissions SET paid = true")) return { rowCount: claimRows.length, rows: claimRows };
        return { rowCount: 1, rows: [] };
      },
    }),
}));

const { payAgentCommissions } = await import("./agentService");

describe("payAgentCommissions", () => {
  beforeEach(() => {
    postJournalMock.mockClear();
  });

  it("pays each currency in its own balanced journal", async () => {
    claimRows = [
      { amount_minor: "10000", currency: "NGN" },
      { amount_minor: "5000", currency: "NGN" },
      { amount_minor: "2000", currency: "USD" },
    ];
    const r = await payAgentCommissions("agent1", "admin");
    expect(postJournalMock).toHaveBeenCalledTimes(2); // one per currency
    const currencies = postJournalMock.mock.calls.map((c) => (c[0] as { entries: { currency: string }[] }).entries[0].currency);
    expect(new Set(currencies)).toEqual(new Set(["NGN", "USD"]));
    // NGN total 15000 credited to the agent's NGN float.
    const ngnCall = postJournalMock.mock.calls.find((c) => (c[0] as { entries: { currency: string }[] }).entries[0].currency === "NGN")!;
    const entries = (ngnCall[0] as { entries: { accountId: string; amountMinor: number }[] }).entries;
    expect(entries.find((e) => e.accountId === "agent_float-NGN")!.amountMinor).toBe(15000);
    expect(entries.find((e) => e.accountId === "expense-NGN")!.amountMinor).toBe(-15000);
    expect(r.paidMinor).toBe(17000);
  });

  it("is a no-op when a concurrent payout already claimed the commissions", async () => {
    claimRows = []; // the guarded claim returns 0 rows
    const r = await payAgentCommissions("agent1", "admin");
    expect(postJournalMock).not.toHaveBeenCalled();
    expect(r).toEqual({ journalId: null, paidMinor: 0 });
  });
});
