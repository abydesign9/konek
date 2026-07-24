import { describe, expect, it } from "vitest";
import { computeTier, missingForTier, resolveRequirements, type Requirement } from "./tierEngine";

const REQS: Requirement[] = [
  { countryCode: null, tier: 1, methodGroups: [["passport", "national_id", "drivers_licence"]] },
  { countryCode: null, tier: 2, methodGroups: [["passport", "national_id", "drivers_licence"], ["selfie_liveness"]] },
  { countryCode: "NG", tier: 1, methodGroups: [["bvn", "nin"]] },
  { countryCode: "NG", tier: 2, methodGroups: [["bvn", "nin"], ["selfie_liveness"]] },
  { countryCode: "US", tier: 1, methodGroups: [["ssn_last4"], ["passport", "drivers_licence"]] },
];

describe("resolveRequirements", () => {
  it("prefers country-specific rows over the global fallback", () => {
    const ng = resolveRequirements(REQS, "NG");
    expect(ng.find((r) => r.tier === 1)?.methodGroups).toEqual([["bvn", "nin"]]);
  });
  it("falls back to global for a country with no rows", () => {
    const fr = resolveRequirements(REQS, "FR");
    expect(fr.find((r) => r.tier === 1)?.methodGroups).toEqual([["passport", "national_id", "drivers_licence"]]);
    expect(fr.find((r) => r.tier === 2)).toBeTruthy();
  });
  it("mixes country tier-1 with global tier-2 when country lacks tier-2", () => {
    const us = resolveRequirements(REQS, "US");
    expect(us.find((r) => r.tier === 1)?.countryCode).toBe("US");
    expect(us.find((r) => r.tier === 2)?.countryCode).toBe(null); // global fallback
  });
});

describe("computeTier", () => {
  it("NG: BVN alone reaches transact but not finance", () => {
    expect(computeTier(REQS, "NG", ["bvn"])).toBe(1);
  });
  it("NG: BVN + selfie reaches finance", () => {
    expect(computeTier(REQS, "NG", ["bvn", "selfie_liveness"])).toBe(2);
  });
  it("NG: a US method does not count", () => {
    expect(computeTier(REQS, "NG", ["ssn_last4"])).toBe(0);
  });
  it("US: needs BOTH ssn group and an ID group", () => {
    expect(computeTier(REQS, "US", ["ssn_last4"])).toBe(0);
    expect(computeTier(REQS, "US", ["ssn_last4", "passport"])).toBe(1);
  });
  it("is cumulative: selfie without a base ID stays tier 0", () => {
    expect(computeTier(REQS, "FR", ["selfie_liveness"])).toBe(0);
    expect(computeTier(REQS, "FR", ["passport"])).toBe(1);
    expect(computeTier(REQS, "FR", ["passport", "selfie_liveness"])).toBe(2);
  });
  it("baseline is 0 with nothing verified", () => {
    expect(computeTier(REQS, "NG", [])).toBe(0);
  });
});

describe("missingForTier", () => {
  it("lists the unmet method groups for the target tier", () => {
    const missing = missingForTier(REQS, "NG", ["bvn"], 2);
    expect(missing).toEqual([["selfie_liveness"]]);
  });
  it("returns nothing when already satisfied", () => {
    expect(missingForTier(REQS, "NG", ["bvn", "selfie_liveness"], 2)).toEqual([]);
  });
});
