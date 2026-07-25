import { describe, expect, it } from "vitest";
import { audienceMatches, canClaim, cashbackMinor, isLive, spendCounts, unlockSatisfied, type Promo } from "./engine";

const base: Promo = {
  id: "p1",
  promoType: "first_deposit",
  rewardType: "wallet_locked",
  targetAudience: "ALL",
  rewardAmountMinor: 500000, // ₦5,000
  rewardCurrency: "NGN",
  cashbackPct: null,
  minDepositMinor: 1000000, // ₦10,000
  minSpendMinor: 500000, // ₦5,000
  validSpendTypes: ["airtime", "data", "card_spend"],
  milestoneMinor: null,
  startDate: "2020-01-01T00:00:00Z",
  endDate: null,
  userCap: 1,
  budgetCapMinor: 2000000,
  totalClaimed: 0,
  totalPaidOutMinor: 0,
  status: "active",
};

describe("isLive", () => {
  it("false when paused, out of window, or budget exhausted", () => {
    expect(isLive({ ...base, status: "paused" })).toBe(false);
    expect(isLive({ ...base, startDate: "2999-01-01T00:00:00Z" })).toBe(false);
    expect(isLive({ ...base, endDate: "2000-01-01T00:00:00Z" })).toBe(false);
    expect(isLive({ ...base, budgetCapMinor: 100000, totalPaidOutMinor: 100000 })).toBe(false);
    expect(isLive(base)).toBe(true);
  });
});

describe("audienceMatches", () => {
  it("NG promo matches NG only; INTL matches non-NG; ALL matches both", () => {
    expect(audienceMatches({ ...base, targetAudience: "NG" }, "NG")).toBe(true);
    expect(audienceMatches({ ...base, targetAudience: "NG" }, "US")).toBe(false);
    expect(audienceMatches({ ...base, targetAudience: "INTL" }, "US")).toBe(true);
    expect(audienceMatches({ ...base, targetAudience: "INTL" }, "NG")).toBe(false);
    expect(audienceMatches({ ...base, targetAudience: "ALL" }, "GB")).toBe(true);
  });
});

describe("canClaim", () => {
  it("respects per-user cap", () => {
    expect(canClaim(base, "NG", 0)).toBe(true);
    expect(canClaim(base, "NG", 1)).toBe(false);
  });
  it("stops before exceeding the budget cap", () => {
    expect(canClaim({ ...base, budgetCapMinor: 700000, totalPaidOutMinor: 300000 }, "NG", 0)).toBe(false);
    expect(canClaim({ ...base, budgetCapMinor: 1000000, totalPaidOutMinor: 300000 }, "NG", 0)).toBe(true);
  });
});

describe("unlockSatisfied", () => {
  it("needs both deposit and spend thresholds", () => {
    expect(unlockSatisfied(base, 1000000, 400000)).toBe(false);
    expect(unlockSatisfied(base, 900000, 500000)).toBe(false);
    expect(unlockSatisfied(base, 1000000, 500000)).toBe(true);
  });
  it("zero thresholds unlock immediately", () => {
    expect(unlockSatisfied({ minDepositMinor: 0, minSpendMinor: 0 }, 0, 0)).toBe(true);
  });
});

describe("spendCounts", () => {
  it("only configured spend types count; empty list counts everything", () => {
    expect(spendCounts(base, "airtime")).toBe(true);
    expect(spendCounts(base, "betting")).toBe(false);
    expect(spendCounts({ validSpendTypes: [] }, "betting")).toBe(true);
  });
});

describe("cashbackMinor", () => {
  it("rounds down and ignores non-positive inputs", () => {
    expect(cashbackMinor({ cashbackPct: 1.5 }, 100000)).toBe(1500);
    expect(cashbackMinor({ cashbackPct: 2 }, 99)).toBe(1); // floor(1.98)
    expect(cashbackMinor({ cashbackPct: null }, 100000)).toBe(0);
    expect(cashbackMinor({ cashbackPct: 1.5 }, 0)).toBe(0);
  });
});
