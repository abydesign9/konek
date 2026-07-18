import { describe, it, expect, vi, beforeEach } from "vitest";

let providerUsedMb = 0;
vi.mock("@/lib/db", () => ({ query: vi.fn(async () => ({ rows: [] })) }));
vi.mock("@/vendors/esim/registry", () => ({
  getEsimProvider: () => ({
    id: "mock",
    capabilities: { supportsUsage: true, supportsActivationFetch: true, provisioningMode: "sync" },
    getUsage: async (iccid: string) => ({ iccid, status: "active", totalMb: null, usedMb: providerUsedMb, remainingMb: null, expiresAt: null }),
  }),
}));

import { refreshEsimUsage, EsimRow } from "./esimService";

function row(overrides: Partial<EsimRow> = {}): EsimRow {
  return {
    id: "e1",
    user_id: "u1",
    txn_id: "t1",
    provider: "mock",
    plan_external_id: "us-5gb-30d",
    iccid: "ICCID-1",
    smdp_address: "smdp.konek.app",
    matching_id: "ICCID-1",
    status: "issued",
    total_mb: "5000",
    used_mb: "0",
    expires_at: null,
    ...overrides,
  };
}

describe("refreshEsimUsage", () => {
  beforeEach(() => {
    providerUsedMb = 0;
  });

  it("reports active with remaining allowance", async () => {
    providerUsedMb = 1000;
    const u = await refreshEsimUsage(row());
    expect(u.status).toBe("active");
    expect(u.usedMb).toBe(1000);
    expect(u.remainingMb).toBe(4000);
  });

  it("clamps usage to the sold allowance and marks depleted", async () => {
    providerUsedMb = 9999;
    const u = await refreshEsimUsage(row({ total_mb: "1000" }));
    expect(u.usedMb).toBe(1000); // clamped
    expect(u.remainingMb).toBe(0);
    expect(u.status).toBe("depleted");
  });

  it("marks expired regardless of remaining data", async () => {
    providerUsedMb = 10;
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const u = await refreshEsimUsage(row({ expires_at: past }));
    expect(u.status).toBe("expired");
  });

  it("leaves total/remaining null when the allowance is unknown", async () => {
    providerUsedMb = 42;
    const u = await refreshEsimUsage(row({ total_mb: null }));
    expect(u.totalMb).toBeNull();
    expect(u.remainingMb).toBeNull();
    expect(u.usedMb).toBe(42);
  });
});
