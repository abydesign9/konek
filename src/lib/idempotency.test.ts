import { describe, expect, it, vi, beforeEach } from "vitest";

type Row = { key: string; request_hash: string; response: string | null; status: number };

let store: Map<string, Row>;

vi.mock("@/lib/db", () => ({
  query: vi.fn(async (text: string, params: unknown[]) => {
    if (text.startsWith("INSERT INTO idempotency_keys")) {
      const [key, requestHash] = params as [string, string];
      if (store.has(key)) return { rows: [] };
      store.set(key, { key, request_hash: requestHash, response: null, status: 0 });
      return { rows: [{ key }] };
    }
    if (text.startsWith("SELECT request_hash")) {
      const [key] = params as [string];
      const row = store.get(key);
      // pg auto-parses jsonb columns into objects, so mimic that here.
      return {
        rows: row ? [{ ...row, response: row.response ? JSON.parse(row.response) : null }] : [],
      };
    }
    if (text.startsWith("UPDATE idempotency_keys")) {
      const [key, response] = params as [string, string];
      const row = store.get(key);
      if (row) {
        row.response = response;
        row.status = 1;
      }
      return { rows: [] };
    }
    if (text.startsWith("DELETE FROM idempotency_keys")) {
      const [key] = params as [string];
      store.delete(key);
      return { rows: [] };
    }
    throw new Error(`unexpected query: ${text}`);
  }),
}));

const { withIdempotency, IdempotencyConflictError, IdempotencyInProgressError } = await import(
  "./idempotency"
);

describe("withIdempotency", () => {
  beforeEach(() => {
    store = new Map();
  });

  it("runs fn on first call and stores the result", async () => {
    const fn = vi.fn(async () => ({ ok: true, id: "txn-1" }));
    const result = await withIdempotency("key-1", { amount: 100 }, fn);
    expect(result).toEqual({ ok: true, id: "txn-1" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("returns the stored result on replay without re-running fn", async () => {
    const fn = vi.fn(async () => ({ ok: true, id: "txn-1" }));
    await withIdempotency("key-1", { amount: 100 }, fn);
    const replay = await withIdempotency("key-1", { amount: 100 }, fn);

    expect(replay).toEqual({ ok: true, id: "txn-1" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("rejects a replay with a different payload under the same key", async () => {
    const fn = vi.fn(async () => ({ ok: true }));
    await withIdempotency("key-1", { amount: 100 }, fn);

    await expect(withIdempotency("key-1", { amount: 200 }, fn)).rejects.toThrow(
      IdempotencyConflictError
    );
  });

  it("rejects a concurrent replay while the original call is still in flight", async () => {
    store.set("key-2", { key: "key-2", request_hash: "", response: null, status: 0 });
    const hashRequest = (await import("./idempotency")).hashRequest;
    store.get("key-2")!.request_hash = hashRequest({ amount: 1 });

    await expect(
      withIdempotency("key-2", { amount: 1 }, vi.fn(async () => ({})))
    ).rejects.toThrow(IdempotencyInProgressError);
  });

  it("releases the claim on failure so the same key can be retried", async () => {
    const failing = vi.fn(async () => {
      throw new Error("insufficient balance");
    });
    await expect(withIdempotency("key-3", { amount: 1 }, failing)).rejects.toThrow(
      "insufficient balance"
    );
    expect(store.has("key-3")).toBe(false);

    const succeeding = vi.fn(async () => ({ ok: true }));
    const result = await withIdempotency("key-3", { amount: 1 }, succeeding);
    expect(result).toEqual({ ok: true });
    expect(succeeding).toHaveBeenCalledTimes(1);
  });
});
