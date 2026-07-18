import { describe, expect, it, vi, beforeEach } from "vitest";

// Simulated transaction row + ledger the fake client reads/writes.
let txnStatus: string;
const postJournalMock = vi.fn(async (..._args: unknown[]) => ({ journalId: "rev-journal-1" }));

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => {}) }));
vi.mock("@/lib/ledger/postJournal", () => ({ postJournal: (...a: unknown[]) => postJournalMock(...a) }));

// withTransaction runs the callback with a fake client whose query() emulates
// the guarded claim UPDATE (only succeeds while status = 'delivered') and the
// net-entries SELECT.
vi.mock("@/lib/db", () => ({
  withTransaction: async (fn: (c: unknown) => unknown) => {
    const client = {
      query: async (text: string) => {
        if (text.includes("UPDATE transactions") && text.includes("status = 'delivered'")) {
          if (txnStatus === "delivered") {
            txnStatus = "refunded";
            return { rowCount: 1, rows: [{ user_id: "u1", status: "refunded" }] };
          }
          return { rowCount: 0, rows: [] };
        }
        if (text.includes("SELECT status FROM transactions")) {
          return { rowCount: 1, rows: [{ status: txnStatus }] };
        }
        if (text.includes("SUM(e.amount_minor)")) {
          return { rows: [{ account_id: "wallet-1", currency: "NGN", net: "5000" }] };
        }
        if (text.includes("INSERT INTO transaction_events")) {
          return { rows: [] };
        }
        throw new Error(`unexpected query: ${text}`);
      },
    };
    return fn(client);
  },
}));

const { refundTransaction, TransactionNotRefundableError } = await import("./refund");

describe("refundTransaction", () => {
  beforeEach(() => {
    txnStatus = "delivered";
    postJournalMock.mockClear();
  });

  it("refunds a delivered transaction by reversing its net effect once", async () => {
    const { journalId } = await refundTransaction("txn-1", "admin@konek.io");
    expect(journalId).toBe("rev-journal-1");
    expect(txnStatus).toBe("refunded");
    // Reversal negates the net (+5000 -> -5000).
    const arg = postJournalMock.mock.calls[0][0] as { entries: { amountMinor: number }[] };
    expect(arg.entries[0].amountMinor).toBe(-5000);
  });

  it("refuses a second refund (idempotent claim)", async () => {
    await refundTransaction("txn-1", "admin@konek.io");
    await expect(refundTransaction("txn-1", "admin@konek.io")).rejects.toBeInstanceOf(
      TransactionNotRefundableError
    );
    expect(postJournalMock).toHaveBeenCalledTimes(1); // no second reversal posted
  });

  it("refuses to refund a non-delivered transaction", async () => {
    txnStatus = "failed";
    await expect(refundTransaction("txn-1", "admin@konek.io")).rejects.toBeInstanceOf(
      TransactionNotRefundableError
    );
    expect(postJournalMock).not.toHaveBeenCalled();
  });
});
