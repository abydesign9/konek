import { describe, expect, it } from "vitest";
import { computeProviderState, routeVendor, selectBestVendor, RoutingCandidate } from "./routing";

function candidate(overrides: Partial<RoutingCandidate> = {}): RoutingCandidate {
  return {
    id: "v",
    priority: 1,
    healthy: true,
    enabled: true,
    maintenance: false,
    circuitOpen: false,
    registered: true,
    floatBalanceMinor: null,
    floatThresholdMinor: 0,
    costWeight: 1,
    successRatePct: null,
    timeoutRatePct: null,
    latencyP95Ms: null,
    ...overrides,
  };
}

describe("computeProviderState", () => {
  it("resolves the six states", () => {
    expect(computeProviderState(candidate())).toBe("healthy");
    expect(computeProviderState(candidate({ enabled: false }))).toBe("disabled");
    expect(computeProviderState(candidate({ maintenance: true }))).toBe("maintenance");
    expect(computeProviderState(candidate({ circuitOpen: true }))).toBe("circuit_open");
    expect(computeProviderState(candidate({ floatBalanceMinor: 100, floatThresholdMinor: 1000 }))).toBe("low_float");
    expect(computeProviderState(candidate({ healthy: false }))).toBe("degraded");
  });

  it("marks a provider degraded on poor live signals", () => {
    expect(computeProviderState(candidate({ successRatePct: 80 }))).toBe("degraded"); // < 90
    expect(computeProviderState(candidate({ timeoutRatePct: 30 }))).toBe("degraded"); // > 20
    expect(computeProviderState(candidate({ latencyP95Ms: 9000 }))).toBe("degraded"); // > 5000
  });

  it("does not block on unknown float", () => {
    expect(computeProviderState(candidate({ floatBalanceMinor: null, floatThresholdMinor: 1000 }))).toBe("healthy");
  });
});

describe("routeVendor", () => {
  it("returns none when nothing is routable", () => {
    const d = routeVendor([candidate({ enabled: false }), candidate({ maintenance: true })]);
    expect(d.chosen).toBeNull();
    expect(d.pool).toBe("none");
  });

  it("prefers a healthy provider over a degraded one, regardless of priority", () => {
    const degradedButPreferred = candidate({ id: "deg", priority: 1, successRatePct: 50 });
    const healthy = candidate({ id: "ok", priority: 9, successRatePct: 99 });
    const d = routeVendor([degradedButPreferred, healthy]);
    expect(d.chosen).toBe("ok");
    expect(d.pool).toBe("healthy");
  });

  it("falls back to the best degraded provider when no healthy one exists", () => {
    const a = candidate({ id: "a", healthy: false, successRatePct: 60 });
    const b = candidate({ id: "b", healthy: false, successRatePct: 80 });
    const d = routeVendor([a, b]);
    expect(d.pool).toBe("degraded");
    expect(d.chosen).toBe("b"); // higher success band
  });

  it("never routes to circuit_open / low_float / maintenance / disabled", () => {
    const d = routeVendor([
      candidate({ id: "co", circuitOpen: true }),
      candidate({ id: "lf", floatBalanceMinor: 0, floatThresholdMinor: 100 }),
      candidate({ id: "mt", maintenance: true }),
      candidate({ id: "dis", enabled: false }),
      candidate({ id: "good" }),
    ]);
    expect(d.chosen).toBe("good");
  });

  it("ranks healthy by success band → cost → latency → priority", () => {
    const cheap = candidate({ id: "cheap", successRatePct: 95, costWeight: 1 });
    const pricey = candidate({ id: "pricey", successRatePct: 96, costWeight: 5 });
    expect(selectBestVendor([pricey, cheap])).toBe("cheap");
  });
});
