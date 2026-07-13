import { describe, expect, it, vi } from "vitest";

const withTransaction = vi.fn();
vi.mock("@/lib/db", () => ({ withTransaction: (fn: unknown) => withTransaction(fn) }));

const { postJournal } = await import("./postJournal");
const { LedgerImbalanceError } = await import("./types");

describe("postJournal", () => {
  it("rejects an unbalanced journal without opening a DB transaction", async () => {
    await expect(
      postJournal({
        description: "test",
        entries: [{ accountId: "a", amountMinor: 5000, currency: "NGN" }],
      })
    ).rejects.toThrow(LedgerImbalanceError);

    expect(withTransaction).not.toHaveBeenCalled();
  });

  it("posts entries and updates cached balances for a balanced journal", async () => {
    const queries: unknown[][] = [];
    withTransaction.mockImplementation(async (fn: (client: unknown) => unknown) => {
      const client = {
        query: vi.fn(async (text: string, params: unknown[]) => {
          queries.push([text, params]);
          if (text.startsWith("INSERT INTO journals")) {
            return { rows: [{ id: "journal-1" }] };
          }
          return { rows: [] };
        }),
      };
      return fn(client);
    });

    const result = await postJournal({
      description: "fund wallet",
      entries: [
        { accountId: "gateway", amountMinor: -10000, currency: "NGN" },
        { accountId: "wallet", amountMinor: 10000, currency: "NGN" },
      ],
    });

    expect(result).toEqual({ journalId: "journal-1" });
    // journal insert + (entry insert + balance upsert) per leg
    expect(queries.length).toBe(1 + 2 * 2);
  });
});
