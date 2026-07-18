import { describe, expect, it, vi, beforeEach } from "vitest";

// The limiter is now backed by Postgres (rl_hit); mock the db layer so these
// stay unit tests. Behaviour under real concurrency is enforced by rl_hit's
// INSERT .. ON CONFLICT DO UPDATE (migration 0023), not by this module.
const queryMock = vi.fn();
vi.mock("@/lib/db", () => ({ query: (...args: unknown[]) => queryMock(...args) }));

import { checkRateLimit, RateLimitExceededError } from "./rateLimit";

describe("checkRateLimit", () => {
  beforeEach(() => queryMock.mockReset());

  it("resolves when rl_hit reports the caller is within budget", async () => {
    queryMock.mockResolvedValue({ rows: [{ allowed: true }] });
    await expect(checkRateLimit("k", 3, 1000)).resolves.toBeUndefined();
  });

  it("throws RateLimitExceededError when rl_hit reports over budget", async () => {
    queryMock.mockResolvedValue({ rows: [{ allowed: false }] });
    await expect(checkRateLimit("k", 3, 1000)).rejects.toBeInstanceOf(RateLimitExceededError);
  });

  it("passes a fixed-window bucket and the limit to rl_hit", async () => {
    queryMock.mockResolvedValue({ rows: [{ allowed: true }] });
    await checkRateLimit("mykey", 5, 1000);
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("rl_hit");
    expect(params[0]).toBe("mykey");
    expect(params[2]).toBe(5);
    expect(Number.isInteger(params[1] as number)).toBe(true);
    expect((params[1] as number) % 1000).toBe(0); // aligned to the window
  });
});
