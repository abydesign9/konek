import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  // No platform_config row in this mock — every call falls back to the
  // seeded defaults (DEFAULT_NGN_PER_USD / DEFAULT_USD_NGN_SPREAD).
  query: vi.fn(async () => ({ rows: [] })),
}));

const { DEFAULT_NGN_PER_USD, DEFAULT_USD_NGN_SPREAD, usdMinorToNgnMinor, usdMinorToNgnMinorUserRate } = await import(
  "./fx"
);

describe("fx", () => {
  it("mid-market: $1 = ₦1600", async () => {
    expect(await usdMinorToNgnMinor(100)).toBe(160000); // 100 cents -> 160000 kobo = ₦1600
  });

  it("user rate applies the spread below mid-market", async () => {
    // $100 = 10000 cents; mid = 10000*1600 = 16,000,000 kobo; less 1.5%
    const expected = Math.floor(10000 * DEFAULT_NGN_PER_USD * (1 - DEFAULT_USD_NGN_SPREAD));
    expect(await usdMinorToNgnMinorUserRate(10000)).toBe(expected);
    expect(await usdMinorToNgnMinorUserRate(10000)).toBeLessThan(await usdMinorToNgnMinor(10000));
  });

  it("user rate floors (never over-credits a fraction of a kobo)", async () => {
    expect(Number.isInteger(await usdMinorToNgnMinorUserRate(333))).toBe(true);
  });
});
