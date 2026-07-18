import { describe, expect, it, vi, beforeEach } from "vitest";

// Rows the mocked db returns for the stale-reservation scan.
let staleRows: Array<{ txn_id: string; vendor: string | null; vendor_ref: string | null; txn_status: string }>;
let verifyStatus: "delivered" | "failed" | "pending";

const settleMock = vi.fn(async () => ({ settled: true }));
const releaseMock = vi.fn(async () => ({ released: true }));

vi.mock("@/lib/db", () => ({ query: vi.fn(async () => ({ rows: staleRows })) }));
vi.mock("@/lib/alerts/externalAlert", () => ({ sendExternalAlert: vi.fn(async () => {}) }));
vi.mock("@/lib/ledger/reservations", () => ({
  settleReservation: (...a: unknown[]) => settleMock(...(a as [])),
  releaseReservation: (...a: unknown[]) => releaseMock(...(a as [])),
}));
vi.mock("@/vendors/registry", () => ({
  getAdapterById: (id: string) =>
    id === "mock_vtu" ? { verify: async () => ({ status: verifyStatus }) } : undefined,
}));

const { recoverStaleReservations } = await import("./reservationRecovery");

describe("recoverStaleReservations", () => {
  beforeEach(() => {
    settleMock.mockClear();
    releaseMock.mockClear();
  });

  it("settles when the vendor confirms delivery", async () => {
    staleRows = [{ txn_id: "t1", vendor: "mock_vtu", vendor_ref: "mock_vtu_t1", txn_status: "pending_vendor" }];
    verifyStatus = "delivered";
    const r = await recoverStaleReservations();
    expect(settleMock).toHaveBeenCalledTimes(1);
    expect(releaseMock).not.toHaveBeenCalled();
    expect(r.settled).toBe(1);
  });

  it("releases when the vendor confirms failure", async () => {
    staleRows = [{ txn_id: "t1", vendor: "mock_vtu", vendor_ref: "mock_vtu_t1", txn_status: "pending_vendor" }];
    verifyStatus = "failed";
    const r = await recoverStaleReservations();
    expect(releaseMock).toHaveBeenCalledTimes(1);
    expect(r.released).toBe(1);
  });

  it("leaves inconclusive when the vendor is still pending", async () => {
    staleRows = [{ txn_id: "t1", vendor: "mock_vtu", vendor_ref: "mock_vtu_t1", txn_status: "pending_vendor" }];
    verifyStatus = "pending";
    const r = await recoverStaleReservations();
    expect(settleMock).not.toHaveBeenCalled();
    expect(releaseMock).not.toHaveBeenCalled();
    expect(r.inconclusive).toBe(1);
  });

  it("releases a reservation whose vendor was never engaged", async () => {
    staleRows = [{ txn_id: "t1", vendor: null, vendor_ref: null, txn_status: "initiated" }];
    const r = await recoverStaleReservations();
    expect(releaseMock).toHaveBeenCalledTimes(1);
    expect(r.released).toBe(1);
  });

  it("leaves inconclusive when in flight without a vendor ref", async () => {
    staleRows = [{ txn_id: "t1", vendor: "mock_vtu", vendor_ref: null, txn_status: "pending_vendor" }];
    const r = await recoverStaleReservations();
    expect(settleMock).not.toHaveBeenCalled();
    expect(releaseMock).not.toHaveBeenCalled();
    expect(r.inconclusive).toBe(1);
  });
});
