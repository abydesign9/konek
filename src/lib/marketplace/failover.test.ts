import { describe, expect, it, vi } from "vitest";
import { runFailover } from "./failover";
import type { SupplierOption } from "./selection";

function chain(...ids: string[]): SupplierOption[] {
  return ids.map((id, i) => ({
    supplierProductId: `sp-${id}`,
    supplierId: id,
    supplierSku: `sku-${id}`,
    costMinor: 300 + i,
    currency: "USD",
    stockStatus: "in_stock",
    apiStatus: "ok",
    active: true,
    purchasePriority: 100,
    successRate: 0.99,
    averageResponseMs: 500,
    supplierEnabled: true,
    supplierHealthy: true,
    circuitOpen: false,
  }));
}

describe("runFailover", () => {
  it("stops at the first supplier that delivers", async () => {
    const attempt = vi.fn(async () => ({ status: "success" as const, token: "LPA:1$x$y" }));
    const res = await runFailover(chain("esimgo", "airalo", "bnesim"), attempt);
    expect(res.outcome).toBe("delivered");
    expect(res.winner?.supplierId).toBe("esimgo");
    expect(res.attempts).toHaveLength(1);
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("falls through failures to the next supplier (eSIMGo -> Airalo -> BNESIM)", async () => {
    const attempt = vi.fn(async (s: SupplierOption) =>
      s.supplierId === "bnesim" ? { status: "success" as const, token: "ok" } : { status: "failed" as const, errorMessage: "down" }
    );
    const res = await runFailover(chain("esimgo", "airalo", "bnesim", "roamify"), attempt);
    expect(res.outcome).toBe("delivered");
    expect(res.winner?.supplierId).toBe("bnesim");
    expect(res.attempts.map((a) => a.supplierId)).toEqual(["esimgo", "airalo", "bnesim"]);
    expect(res.attempts.map((a) => a.status)).toEqual(["failed", "failed", "success"]);
  });

  it("caps attempts at the retry limit even if the chain is longer", async () => {
    const attempt = vi.fn(async () => ({ status: "failed" as const, errorMessage: "nope" }));
    const res = await runFailover(chain("a", "b", "c", "d", "e"), attempt, 3);
    expect(res.outcome).toBe("failed");
    expect(res.attempts).toHaveLength(3);
    expect(attempt).toHaveBeenCalledTimes(3);
  });

  it("treats a thrown error as a failed attempt and keeps going", async () => {
    const attempt = vi.fn(async (s: SupplierOption) => {
      if (s.supplierId === "esimgo") throw new Error("network blew up");
      return { status: "success" as const };
    });
    const res = await runFailover(chain("esimgo", "airalo"), attempt);
    expect(res.attempts[0].status).toBe("failed");
    expect(res.attempts[0].errorMessage).toBe("network blew up");
    expect(res.winner?.supplierId).toBe("airalo");
  });

  it("stops on pending (order accepted, money stays held) without trying more suppliers", async () => {
    const attempt = vi.fn(async () => ({ status: "pending" as const, vendorRef: "B123" }));
    const res = await runFailover(chain("esimgo", "airalo"), attempt);
    expect(res.outcome).toBe("pending");
    expect(res.attempts).toHaveLength(1);
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("returns failed with the full attempt log when every supplier fails", async () => {
    const attempt = vi.fn(async () => ({ status: "failed" as const, errorCode: "200007" }));
    const res = await runFailover(chain("a", "b"), attempt);
    expect(res.outcome).toBe("failed");
    expect(res.winner).toBeNull();
    expect(res.attempts).toHaveLength(2);
  });
});
