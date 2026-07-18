import { describe, expect, it } from "vitest";
import { applyMarkup, grossMarginBps, decidePrice, PricingRule } from "./pricing";

const rule: PricingRule = { markupBps: 500, minMarginBps: 200 }; // 5% markup, 2% floor

describe("pricing math", () => {
  it("applies markup in bps", () => {
    expect(applyMarkup(10000, rule)).toBe(10500); // +5%
    expect(applyMarkup(33333, { markupBps: 1000, minMarginBps: 0 })).toBe(36666); // +10%, rounded
  });

  it("computes gross margin on the selling price", () => {
    expect(grossMarginBps(9500, 10000)).toBe(500); // 5%
    expect(grossMarginBps(10000, 10000)).toBe(0); // sell at cost
    expect(grossMarginBps(11000, 10000)).toBeLessThan(0); // below cost
  });

  it("treats a non-positive price as a total breach", () => {
    expect(grossMarginBps(100, 0)).toBe(-10000);
  });
});

describe("decidePrice (fail-closed)", () => {
  it("publishes when margin clears the floor", () => {
    const d = decidePrice({ costMinor: 10000, rule });
    expect(d.publish).toBe(true);
    expect(d.priceMinor).toBe(10500);
    expect(d.marginBps).toBeGreaterThanOrEqual(rule.minMarginBps);
  });

  it("does NOT publish when the derived margin is below the floor", () => {
    // A near-zero markup rule pushes margin under the 2% floor.
    const tightRule: PricingRule = { markupBps: 50, minMarginBps: 200 };
    const d = decidePrice({ costMinor: 10000, rule: tightRule });
    expect(d.publish).toBe(false);
    expect(d.reason).toBe("below_min_margin");
  });

  it("fails closed when a cost spike erodes a locked manual price", () => {
    // Locked price 10000, cost jumps to 9950 -> margin 50bps < 200bps floor.
    const d = decidePrice({ costMinor: 9950, rule, lockedPriceMinor: 10000 });
    expect(d.publish).toBe(false);
  });

  it("keeps a healthy locked price", () => {
    const d = decidePrice({ costMinor: 8000, rule, lockedPriceMinor: 10000 });
    expect(d.publish).toBe(true);
    expect(d.priceMinor).toBe(10000); // manual price preserved
  });
});
