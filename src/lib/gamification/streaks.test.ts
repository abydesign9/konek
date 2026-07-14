import { describe, expect, it, vi, beforeEach } from "vitest";

interface StreakRow {
  current_streak_weeks: number;
  longest_streak_weeks: number;
  last_qualifying_txn_at: string | null;
}

let streak: StreakRow;

vi.mock("@/lib/db", () => ({
  query: vi.fn(async (text: string, params: unknown[] = []) => {
    if (text.startsWith("INSERT INTO streaks")) {
      return { rows: [{ ...streak }] };
    }
    if (text.includes("current_streak_weeks = 1,")) {
      streak = {
        current_streak_weeks: 1,
        longest_streak_weeks: Math.max(1, streak.longest_streak_weeks),
        last_qualifying_txn_at: new Date().toISOString(),
      };
      return { rows: [] };
    }
    if (text.includes("SET last_qualifying_txn_at = now()")) {
      streak.last_qualifying_txn_at = new Date().toISOString();
      return { rows: [] };
    }
    if (text.includes("current_streak_weeks = $2")) {
      const [, newStreak] = params as [string, number];
      streak.current_streak_weeks = newStreak;
      streak.longest_streak_weeks = Math.max(streak.longest_streak_weeks, newStreak);
      streak.last_qualifying_txn_at = new Date().toISOString();
      return { rows: [] };
    }
    throw new Error(`unexpected query: ${text}`);
  }),
}));

const { updateStreak } = await import("./streaks");

// Monday of a fixed reference week, for deterministic "this week" math.
const MONDAY = new Date("2026-03-02T12:00:00Z"); // a Monday

describe("updateStreak", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    streak = { current_streak_weeks: 0, longest_streak_weeks: 0, last_qualifying_txn_at: null };
  });

  it("starts a streak at 1 on the first-ever qualifying purchase", async () => {
    vi.setSystemTime(MONDAY);
    await updateStreak("user-1");
    expect(streak.current_streak_weeks).toBe(1);
  });

  it("does not increment further for a second purchase in the same week", async () => {
    vi.setSystemTime(MONDAY);
    await updateStreak("user-1");
    vi.setSystemTime(new Date(MONDAY.getTime() + 2 * 86_400_000)); // Wednesday, same week
    await updateStreak("user-1");
    expect(streak.current_streak_weeks).toBe(1);
  });

  it("increments when the next purchase falls in the following week", async () => {
    vi.setSystemTime(MONDAY);
    await updateStreak("user-1");
    vi.setSystemTime(new Date(MONDAY.getTime() + 7 * 86_400_000)); // next Monday
    await updateStreak("user-1");
    expect(streak.current_streak_weeks).toBe(2);
  });

  it("resets to 1 when a week is skipped entirely", async () => {
    vi.setSystemTime(MONDAY);
    await updateStreak("user-1");
    vi.setSystemTime(new Date(MONDAY.getTime() + 21 * 86_400_000)); // three weeks later
    await updateStreak("user-1");
    expect(streak.current_streak_weeks).toBe(1);
  });

  it("tracks the longest streak even after a reset", async () => {
    vi.setSystemTime(MONDAY);
    await updateStreak("user-1");
    vi.setSystemTime(new Date(MONDAY.getTime() + 7 * 86_400_000));
    await updateStreak("user-1"); // streak = 2
    vi.setSystemTime(new Date(MONDAY.getTime() + 14 * 86_400_000));
    await updateStreak("user-1"); // streak = 3
    vi.setSystemTime(new Date(MONDAY.getTime() + 42 * 86_400_000)); // big gap, resets to 1
    await updateStreak("user-1");
    expect(streak.current_streak_weeks).toBe(1);
    expect(streak.longest_streak_weeks).toBe(3);
  });
});
