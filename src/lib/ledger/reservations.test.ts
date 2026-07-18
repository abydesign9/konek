import { describe, expect, it, vi, beforeEach } from "vitest";

// Mutable reservation status the fake client's guarded UPDATE reads/flips.
let status: "held" | "settled" | "released";
const postJournalMock = vi.fn(async (..._a: unknown[]) => ({ journalId: "jrnl-1" }));

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => {}) }));
vi.mock("@/lib/ledger/postJournal", () => ({ postJournal: (...a: unknown[]) => postJournalMock(...a) }));
vi.mock("@/lib/ledger/accounts", () => ({ getOrCreateAccount: vi.fn(async () => "vendor-float-acct") }));

vi.mock("@/lib/db", () => ({
  withTransaction: async (fn: (c: unknown) => unknown) => {
    const client = {
      query: async (text: string) => {
        if (text.includes("UPDATE reservations SET status = 'settled'")) {
          if (status === "held") {
            status = "settled";
            return {
              rowCount: 1,
              rows: [{ amount_minor: "5000", currency: "NGN", wallet_account_id: "w1", reserve_account_id: "r1" }],
            };
          }
          return { rowCount: 0, rows: [] };
        }
        if (text.includes("UPDATE reservations SET status = 'released'")) {
          if (status === "held") {
            status = "released";
            return {
              rowCount: 1,
              rows: [{ amount_minor: "5000", currency: "NGN", wallet_account_id: "w1", reserve_account_id: "r1" }],
            };
          }
          return { rowCount: 0, rows: [] };
        }
        return { rowCount: 1, rows: [] };
      },
    };
    return fn(client);
  },
}));

const { settleReservation, releaseReservation } = await import("./reservations");

describe("settleReservation", () => {
  beforeEach(() => {
    status = "held";
    postJournalMock.mockClear();
  });

  it("settles a held reservation: reserve -> vendor float", async () => {
    const out = await settleReservation("txn-1", { vendorRef: "v1" });
    expect(out.settled).toBe(true);
    const arg = postJournalMock.mock.calls[0][0] as {
      journalType: string;
      entries: { accountId: string; amountMinor: number }[];
    };
    expect(arg.journalType).toBe("settlement");
    expect(arg.entries).toEqual([
      { accountId: "r1", amountMinor: -5000, currency: "NGN" },
      { accountId: "vendor-float-acct", amountMinor: 5000, currency: "NGN" },
    ]);
  });

  it("is idempotent — a second settle is a no-op", async () => {
    await settleReservation("txn-1", { vendorRef: "v1" });
    const out = await settleReservation("txn-1", { vendorRef: "v1" });
    expect(out.settled).toBe(false);
    expect(postJournalMock).toHaveBeenCalledTimes(1);
  });
});

describe("releaseReservation", () => {
  beforeEach(() => {
    status = "held";
    postJournalMock.mockClear();
  });

  it("releases a held reservation: reserve -> wallet", async () => {
    const out = await releaseReservation("txn-1", { reason: "vendor_declined" });
    expect(out.released).toBe(true);
    const arg = postJournalMock.mock.calls[0][0] as {
      journalType: string;
      entries: { accountId: string; amountMinor: number }[];
    };
    expect(arg.journalType).toBe("release");
    expect(arg.entries).toEqual([
      { accountId: "r1", amountMinor: -5000, currency: "NGN" },
      { accountId: "w1", amountMinor: 5000, currency: "NGN" },
    ]);
  });

  it("is idempotent — cannot release after settle", async () => {
    status = "settled";
    const out = await releaseReservation("txn-1", { reason: "vendor_declined" });
    expect(out.released).toBe(false);
    expect(postJournalMock).not.toHaveBeenCalled();
  });
});
