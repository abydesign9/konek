import { describe, expect, it, vi, beforeEach } from "vitest";

interface MockUser {
  kyc_tier: number;
  created_at: string;
}

let user: MockUser;
let limits: { metric: string; max_minor: string }[];
let spentToday: number;
let riskFlags: unknown[];

vi.mock("@/lib/db", () => ({
  query: vi.fn(async (text: string, params: unknown[]) => {
    if (text.startsWith("SELECT kyc_tier")) {
      return { rows: [user] };
    }
    if (text.startsWith("SELECT metric, max_minor")) {
      return { rows: limits };
    }
    if (text.startsWith("SELECT SUM(amount_minor)")) {
      return { rows: [{ spent: String(spentToday) }] };
    }
    if (text.startsWith("INSERT INTO risk_flags")) {
      riskFlags.push(params);
      return { rows: [] };
    }
    throw new Error(`unexpected query: ${text}`);
  }),
}));

const { checkVelocityLimits, LimitExceededError } = await import("./checkLimits");

describe("checkVelocityLimits", () => {
  beforeEach(() => {
    user = { kyc_tier: 1, created_at: new Date(Date.now() - 10 * 24 * 3_600_000).toISOString() }; // 10 days old
    limits = [
      { metric: "single_txn", max_minor: "2000000" }, // ₦20,000
      { metric: "daily_spend", max_minor: "5000000" }, // ₦50,000
    ];
    spentToday = 0;
    riskFlags = [];
  });

  it("passes when well under both limits", async () => {
    await expect(checkVelocityLimits("user-1", 100000, "NGN")).resolves.toBeUndefined();
    expect(riskFlags).toHaveLength(0);
  });

  it("rejects a single transaction over the per-txn cap", async () => {
    await expect(checkVelocityLimits("user-1", 3000000, "NGN")).rejects.toThrow(LimitExceededError);
    expect(riskFlags).toHaveLength(1);
  });

  it("rejects when today's spend would exceed the daily cap", async () => {
    spentToday = 4900000; // already spent ₦49,000 today
    await expect(checkVelocityLimits("user-1", 200000, "NGN")).rejects.toThrow(LimitExceededError);
  });

  it("allows spend that stays within the daily cap", async () => {
    spentToday = 4000000;
    await expect(checkVelocityLimits("user-1", 500000, "NGN")).resolves.toBeUndefined();
  });

  it("is unlimited when no limit rows exist for the user's tier", async () => {
    limits = [];
    await expect(checkVelocityLimits("user-1", 100_000_000, "NGN")).resolves.toBeUndefined();
  });

  it("applies the tighter new_account_daily cap within the first 72 hours", async () => {
    user.created_at = new Date(Date.now() - 24 * 3_600_000).toISOString(); // 1 day old
    limits = [{ metric: "new_account_daily", max_minor: "1000000" }]; // ₦10,000/day
    spentToday = 900000;

    await expect(checkVelocityLimits("user-1", 200000, "NGN")).rejects.toThrow(LimitExceededError);
  });

  it("does not apply new_account_daily once past 72 hours", async () => {
    user.created_at = new Date(Date.now() - 100 * 3_600_000).toISOString(); // >72h old
    limits = [{ metric: "new_account_daily", max_minor: "1000000" }];
    spentToday = 900000;

    // new_account_daily doesn't apply anymore, and there's no daily_spend row, so unlimited
    await expect(checkVelocityLimits("user-1", 200000, "NGN")).resolves.toBeUndefined();
  });
});
