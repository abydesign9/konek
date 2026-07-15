import { describe, expect, it } from "vitest";
import { NGN_PER_USD, USD_NGN_SPREAD, usdMinorToNgnMinor, usdMinorToNgnMinorUserRate } from "./fx";

describe("fx", () => {
  it("mid-market: $1 = ₦1600", () => {
    expect(usdMinorToNgnMinor(100)).toBe(160000); // 100 cents -> 160000 kobo = ₦1600
  });

  it("user rate applies the spread below mid-market", () => {
    // $100 = 10000 cents; mid = 10000*1600 = 16,000,000 kobo; less 1.5%
    const expected = Math.floor(10000 * NGN_PER_USD * (1 - USD_NGN_SPREAD));
    expect(usdMinorToNgnMinorUserRate(10000)).toBe(expected);
    expect(usdMinorToNgnMinorUserRate(10000)).toBeLessThan(usdMinorToNgnMinor(10000));
  });

  it("user rate floors (never over-credits a fraction of a kobo)", () => {
    expect(Number.isInteger(usdMinorToNgnMinorUserRate(333))).toBe(true);
  });
});
