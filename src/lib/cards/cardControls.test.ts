import { describe, expect, it, vi, beforeEach } from "vitest";

interface MockCard {
  provider_card_id: string;
  status: string;
  single_txn_limit_minor: string | null;
  monthly_limit_minor: string | null;
  merchant_lock: string | null;
}

let card: MockCard;
let monthSpent: number;
let declinedRows: { reason: string }[];

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => {}) }));
vi.mock("@/lib/notifications/send", () => ({ sendNotification: vi.fn(async () => {}) }));

vi.mock("@/lib/db", () => ({
  query: vi.fn(async (text: string, params: unknown[]) => {
    if (text.includes("SELECT provider_card_id, status, single_txn_limit_minor")) {
      return { rows: [card] };
    }
    if (text.includes("SUM(amount_minor) AS spent")) {
      return { rows: [{ spent: String(monthSpent) }] };
    }
    if (text.startsWith("INSERT INTO card_transactions")) {
      declinedRows.push({ reason: String(params[5]) });
      return { rows: [{ id: "ct1" }] };
    }
    throw new Error(`unexpected query: ${text}`);
  }),
}));

// The adapter should never be reached when a control declines the auth.
const authorizeSpy = vi.fn(async () => ({ providerRef: "r", threeDsChallengeId: "c" }));
vi.mock("@/vendors/cards/mockSudo", () => ({
  mockSudoAdapter: { id: "mock_sudo", authorize: authorizeSpy },
  expectedOtpForChallenge: () => "000000",
}));

const { authorizeCardPurchase, CardDeclinedError } = await import("./cardService");

describe("card controls enforcement", () => {
  beforeEach(() => {
    card = { provider_card_id: "pc", status: "active", single_txn_limit_minor: null, monthly_limit_minor: null, merchant_lock: null };
    monthSpent = 0;
    declinedRows = [];
    authorizeSpy.mockClear();
  });

  it("declines when the merchant is not the locked one", async () => {
    card.merchant_lock = "Netflix";
    await expect(authorizeCardPurchase("card1", "u1", 1000, "Amazon")).rejects.toMatchObject({
      name: "CardDeclinedError",
      reason: "merchant_locked",
    });
    expect(authorizeSpy).not.toHaveBeenCalled();
    expect(declinedRows.at(-1)?.reason).toBe("merchant_locked");
  });

  it("allows the locked merchant (case-insensitive)", async () => {
    card.merchant_lock = "Netflix";
    await expect(authorizeCardPurchase("card1", "u1", 1000, "netflix")).resolves.toMatchObject({});
    expect(authorizeSpy).toHaveBeenCalled();
  });

  it("declines over the per-transaction limit", async () => {
    card.single_txn_limit_minor = "5000"; // $50
    await expect(authorizeCardPurchase("card1", "u1", 6000, "Amazon")).rejects.toBeInstanceOf(CardDeclinedError);
    expect(declinedRows.at(-1)?.reason).toBe("single_txn_limit");
  });

  it("declines when month-to-date + amount exceeds the monthly limit", async () => {
    card.monthly_limit_minor = "10000"; // $100
    monthSpent = 9500;
    await expect(authorizeCardPurchase("card1", "u1", 1000, "Amazon")).rejects.toBeInstanceOf(CardDeclinedError);
    expect(declinedRows.at(-1)?.reason).toBe("monthly_limit");
  });

  it("authorizes when within all controls", async () => {
    card.single_txn_limit_minor = "10000";
    card.monthly_limit_minor = "50000";
    monthSpent = 1000;
    await expect(authorizeCardPurchase("card1", "u1", 2500, "Amazon")).resolves.toMatchObject({});
    expect(authorizeSpy).toHaveBeenCalledOnce();
  });
});
