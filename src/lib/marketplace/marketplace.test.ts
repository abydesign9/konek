import { describe, expect, it } from "vitest";
import { normalisePlan, normaliseData, normaliseValidity, displayNameFor } from "./matching";
import { computePrice, selectRule, type PricingRule } from "./pricing";
import { selectSuppliers, failoverChain, type SupplierOption } from "./selection";

// ---------------- Matching ----------------

describe("matching / fingerprint", () => {
  it("collapses the same plan from four suppliers into one fingerprint", () => {
    const a = normalisePlan({ country: "Nigeria", operator: "MTN", data: "1GB", validity: "7 Days", networkType: "4G" });
    const b = normalisePlan({ country: "NG", operator: "mtn", data: "1024", dataUnit: "MB", validity: "1 Week", networkType: "LTE" });
    const c = normalisePlan({ country: "nigeria", operator: "MTN Nigeria", data: 1, dataUnit: "GB", validity: 7, networkType: "3G/4G" });
    const d = normalisePlan({ country: "NG", operator: "MTN", data: "1 GB", validity: "7d", networkType: "4g" });
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(b.fingerprint).toBe(c.fingerprint);
    expect(c.fingerprint).toBe(d.fingerprint);
  });

  it("keeps genuinely different plans apart (5G vs 4G, region vs country, size)", () => {
    const base = normalisePlan({ country: "NG", operator: "MTN", data: "1GB", validity: "7 Days", networkType: "4G" });
    const fiveG = normalisePlan({ country: "NG", operator: "MTN", data: "1GB", validity: "7 Days", networkType: "5G" });
    const twoGb = normalisePlan({ country: "NG", operator: "MTN", data: "2GB", validity: "7 Days", networkType: "4G" });
    const region = normalisePlan({ region: "Europe", operator: "MTN", data: "1GB", validity: "7 Days", networkType: "4G" });
    expect(base.fingerprint).not.toBe(fiveG.fingerprint);
    expect(base.fingerprint).not.toBe(twoGb.fingerprint);
    expect(base.fingerprint).not.toBe(region.fingerprint);
  });

  it("normalises data units and validity periods", () => {
    expect(normaliseData("1024", "MB")).toBe(1);
    expect(normaliseData("1TB")).toBe(1024);
    expect(normaliseData("Unlimited")).toBe(-1);
    expect(normaliseValidity("1 Week")).toBe(7);
    expect(normaliseValidity("1 Month")).toBe(30);
    expect(normaliseValidity(30, "DAY")).toBe(30);
  });

  it("builds a readable display name", () => {
    const p = normalisePlan({ country: "Nigeria", operator: "MTN", data: "1GB", validity: "7 Days" });
    expect(displayNameFor(p)).toBe("NG · MTN · 1GB · 7 days");
  });
});

// ---------------- Pricing ----------------

const TIERS: PricingRule[] = [
  { id: "t1", name: "under $3", minCostMinor: 0, maxCostMinor: 300, markupPct: 145, priority: 900, active: true },
  { id: "t2", name: "$3–$5", minCostMinor: 300, maxCostMinor: 500, markupPct: 110, priority: 900, active: true },
  { id: "t3", name: "$5–$10", minCostMinor: 500, maxCostMinor: 1000, markupPct: 80, priority: 900, active: true },
  { id: "t4", name: "$10–$20", minCostMinor: 1000, maxCostMinor: 2000, markupPct: 60, priority: 900, active: true },
  { id: "t5", name: "over $20", minCostMinor: 2000, maxCostMinor: null, markupPct: 40, priority: 900, active: true },
];

describe("pricing engine", () => {
  it("applies the right tier band by cost", () => {
    expect(computePrice(285, TIERS).priceMinor).toBe(Math.ceil(285 * 2.45)); // $2.85 -> 145%
    expect(computePrice(400, TIERS).appliedRuleName).toBe("$3–$5");
    expect(computePrice(700, TIERS).markupPct).toBe(80);
    expect(computePrice(1500, TIERS).markupPct).toBe(60);
    expect(computePrice(3000, TIERS).markupPct).toBe(40);
  });

  it("band edges are inclusive-lower / exclusive-upper", () => {
    expect(computePrice(300, TIERS).markupPct).toBe(110); // 300 -> tier 2, not tier 1
    expect(computePrice(299, TIERS).markupPct).toBe(145);
  });

  it("never rounds below cost", () => {
    const r = computePrice(1, TIERS);
    expect(r.priceMinor).toBeGreaterThanOrEqual(1);
  });

  it("prefers a more specific country/supplier rule at equal priority", () => {
    const rules: PricingRule[] = [
      ...TIERS,
      { id: "ng", name: "NG special", minCostMinor: 0, maxCostMinor: 1000, markupPct: 30, priority: 900, active: true, country: "NG" },
    ];
    const chosen = selectRule(rules, 285, { country: "NG" });
    expect(chosen?.id).toBe("ng");
    expect(computePrice(285, rules, { country: "NG" }).markupPct).toBe(30);
    // A different country still gets the global tier.
    expect(computePrice(285, rules, { country: "US" }).markupPct).toBe(145);
  });

  it("override precedence: promo > price override > markup override > rule", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(computePrice(285, TIERS, {}, { markupOverridePct: 10 }, now).source).toBe("markup_override");
    expect(computePrice(285, TIERS, {}, { priceOverrideMinor: 999, markupOverridePct: 10 }, now).priceMinor).toBe(999);
    expect(computePrice(285, TIERS, {}, { promoPriceMinor: 500, priceOverrideMinor: 999 }, now).priceMinor).toBe(500);
  });

  it("ignores expired overrides and falls back to the tier", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    const r = computePrice(285, TIERS, {}, { promoPriceMinor: 500, overrideExpiresAt: "2026-01-01T00:00:00Z" }, now);
    expect(r.source).toBe("rule");
    expect(r.markupPct).toBe(145);
  });

  it("computes margin", () => {
    const r = computePrice(500, TIERS); // 80% -> price 900
    expect(r.priceMinor).toBe(900);
    expect(r.marginMinor).toBe(400);
    expect(r.marginPct).toBeCloseTo(400 / 900, 5);
  });
});

// ---------------- Selection / failover ----------------

function opt(over: Partial<SupplierOption>): SupplierOption {
  return {
    supplierProductId: "sp",
    supplierId: "s",
    supplierSku: "sku",
    costMinor: 300,
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
    ...over,
  };
}

describe("supplier selection + failover", () => {
  it("picks the cheapest eligible supplier by default", () => {
    const res = selectSuppliers([
      opt({ supplierId: "esimgo", costMinor: 285 }),
      opt({ supplierId: "airalo", costMinor: 310 }),
      opt({ supplierId: "bnesim", costMinor: 295 }),
    ]);
    expect(res.chosen?.supplierId).toBe("esimgo");
    expect(res.chain.map((c) => c.supplierId)).toEqual(["esimgo", "bnesim", "airalo"]);
  });

  it("honours a manual supplier override even when it's not cheapest", () => {
    const res = selectSuppliers(
      [opt({ supplierId: "esimgo", costMinor: 285 }), opt({ supplierId: "airalo", costMinor: 310 })],
      { recommendedSupplierId: "airalo" }
    );
    expect(res.chosen?.supplierId).toBe("airalo");
  });

  it("excludes out-of-stock, down, disabled, unhealthy and circuit-open suppliers", () => {
    const res = selectSuppliers([
      opt({ supplierId: "a", stockStatus: "out_of_stock" }),
      opt({ supplierId: "b", apiStatus: "down" }),
      opt({ supplierId: "c", supplierEnabled: false }),
      opt({ supplierId: "d", supplierHealthy: false }),
      opt({ supplierId: "e", circuitOpen: true }),
      opt({ supplierId: "f", costMinor: 999 }),
    ]);
    expect(res.chosen?.supplierId).toBe("f");
    expect(res.ineligible).toHaveLength(5);
  });

  it("breaks cost ties by success rate then latency", () => {
    const res = selectSuppliers([
      opt({ supplierId: "slow", costMinor: 300, successRate: 0.9, averageResponseMs: 2000 }),
      opt({ supplierId: "reliable", costMinor: 300, successRate: 0.99, averageResponseMs: 800 }),
      opt({ supplierId: "fast-flaky", costMinor: 300, successRate: 0.9, averageResponseMs: 100 }),
    ]);
    expect(res.chain.map((c) => c.supplierId)).toEqual(["reliable", "fast-flaky", "slow"]);
  });

  it("caps the failover chain at the retry limit", () => {
    const many = Array.from({ length: 6 }, (_, i) => opt({ supplierId: `s${i}`, costMinor: 300 + i }));
    expect(failoverChain(many)).toHaveLength(3);
  });

  it("returns no supplier when none are eligible", () => {
    const res = selectSuppliers([opt({ supplierId: "a", stockStatus: "out_of_stock" })]);
    expect(res.chosen).toBeNull();
  });
});
