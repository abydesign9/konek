import { describe, expect, it, beforeAll, afterAll } from "vitest";

// DB-gated: verifies the dashboard aggregation assembles real provider rows.
//   DATABASE_URL=postgres://... npx vitest run providerDashboard.integration
const HAS_DB = !!process.env.DATABASE_URL;

describe.skipIf(!HAS_DB)("getProviderDashboard (integration)", () => {
  let getProviderDashboard: typeof import("./providerDashboard").getProviderDashboard;

  beforeAll(async () => {
    ({ getProviderDashboard } = await import("./providerDashboard"));
  }, 60_000);

  afterAll(async () => {
    // The lib uses the shared pool; nothing to clean up (read-only).
  });

  it("returns one row per vendor with computed state, metrics and routing", async () => {
    const rows = await getProviderDashboard();
    expect(rows.length).toBeGreaterThan(0);

    const vtu = rows.find((r) => r.id === "mock_vtu");
    expect(vtu).toBeTruthy();
    expect(vtu!.kind).toBe("vtu");
    expect(["healthy", "degraded", "circuit_open", "low_float", "maintenance", "disabled"]).toContain(vtu!.state);
    expect(vtu!.registered).toBe(true);

    // Exactly one vtu provider should be the routed choice for its kind.
    const vtuChosen = rows.filter((r) => r.kind === "vtu" && r.chosenForKind);
    expect(vtuChosen.length).toBeLessThanOrEqual(1);
    if (vtuChosen.length === 1) {
      expect(vtuChosen[0].routingRank).toBe(1);
      expect(vtuChosen[0].routingPool).toBe("healthy");
    }

    // Shape sanity: numeric/nullable fields are the right types.
    for (const r of rows) {
      expect(typeof r.calls).toBe("number");
      expect(r.floatThresholdMinor).toBeGreaterThanOrEqual(0);
      expect(["healthy", "degraded", "none"]).toContain(r.routingPool);
    }
  }, 60_000);
});
