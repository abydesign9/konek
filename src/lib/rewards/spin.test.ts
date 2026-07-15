import { describe, expect, it, vi, beforeEach } from "vitest";

let lastSpinRow: { coins: number; meta: Record<string, unknown> } | null;
let spentTodayMinor: number;
let inserted: { kind: string; coins: number; creditMinor: number }[];
let coinBumps: number[];
let journalsPosted: unknown[];

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => {}) }));
vi.mock("@/lib/notifications/send", () => ({ sendNotification: vi.fn(async () => {}) }));
vi.mock("@/lib/gamification/coinBalance", () => ({
  bumpCoinBalance: vi.fn(async (_userId: string, delta: number) => {
    coinBumps.push(delta);
  }),
}));
vi.mock("@/lib/ledger/accounts", () => ({
  getUserWalletAccount: vi.fn(async () => "wallet-acc"),
  getOrCreateAccount: vi.fn(async () => "expense-acc"),
}));
vi.mock("@/lib/ledger/postJournal", () => ({
  postJournal: vi.fn(async (input: unknown) => {
    journalsPosted.push(input);
    return { journalId: "j1" };
  }),
}));

vi.mock("@/lib/db", () => ({
  query: vi.fn(async (text: string, params: unknown[]) => {
    if (text.includes("FROM reward_events") && text.includes("kind = 'spin'") && text.includes("ORDER BY created_at DESC LIMIT 1")) {
      return { rows: lastSpinRow ? [lastSpinRow] : [] };
    }
    if (text.includes("SUM(coins_earn_credit.credit_minor)")) {
      return { rows: [{ spent: String(spentTodayMinor) }] };
    }
    if (text.startsWith("INSERT INTO reward_events")) {
      // SQL hardcodes kind='spin'; params are [userId, coins, creditMinor, meta]
      inserted.push({ kind: "spin", coins: Number(params[1]), creditMinor: Number(params[2]) });
      return { rows: [] };
    }
    if (text.startsWith("INSERT INTO transactions")) {
      return { rows: [{ id: "txn1" }] };
    }
    if (text.startsWith("UPDATE transactions") || text.startsWith("INSERT INTO transaction_events")) {
      return { rows: [] };
    }
    throw new Error(`unexpected query: ${text}`);
  }),
}));

const { spin, getSpinStatus, AlreadySpunTodayError } = await import("./spin");

describe("spin", () => {
  beforeEach(() => {
    lastSpinRow = null;
    spentTodayMinor = 0;
    inserted = [];
    coinBumps = [];
    journalsPosted = [];
    vi.spyOn(Math, "random");
  });

  it("reports canSpin=true when no spin today", async () => {
    const status = await getSpinStatus("u1");
    expect(status.canSpin).toBe(true);
    expect(status.lastResult).toBeNull();
  });

  it("blocks a second spin the same day", async () => {
    lastSpinRow = { coins: 10, meta: { label: "10 coins", creditMinor: 0, budgetLimited: false } };
    await expect(spin("u1")).rejects.toBeInstanceOf(AlreadySpunTodayError);
  });

  it("awards a coins-only outcome without touching the ledger", async () => {
    (Math.random as ReturnType<typeof vi.spyOn>).mockReturnValue(0); // first bucket: 10 coins
    const result = await spin("u1");
    expect(result.coins).toBe(10);
    expect(result.creditMinor).toBe(0);
    expect(journalsPosted).toHaveLength(0);
    expect(inserted[0]).toMatchObject({ kind: "spin", coins: 10, creditMinor: 0 });
  });

  it("posts a balanced ledger journal for a credit outcome", async () => {
    // weights: 40,25,15,10,5,4,1 -> cumulative up to the ₦50-credit bucket starts at 80
    (Math.random as ReturnType<typeof vi.spyOn>).mockReturnValue(0.82); // lands in the ₦50 credit bucket
    const result = await spin("u1");
    expect(result.creditMinor).toBe(5000);
    expect(journalsPosted).toHaveLength(1);
    const entries = (journalsPosted[0] as { entries: { amountMinor: number }[] }).entries;
    expect(entries.reduce((s, e) => s + e.amountMinor, 0)).toBe(0);
  });

  it("degrades to coins-only when the daily budget is exhausted", async () => {
    spentTodayMinor = 5_000_000; // budget already fully spent
    (Math.random as ReturnType<typeof vi.spyOn>).mockReturnValue(0.82); // would-be credit bucket
    const result = await spin("u1");
    expect(result.creditMinor).toBe(0);
    expect(result.budgetLimited).toBe(true);
    expect(journalsPosted).toHaveLength(0);
  });
});
