import { describe, expect, it } from "vitest";
import { assertBalanced } from "./assertBalanced";
import { LedgerImbalanceError, NonIntegerAmountError } from "./types";

describe("assertBalanced", () => {
  it("accepts a balanced two-leg journal", () => {
    expect(() =>
      assertBalanced([
        { accountId: "a", amountMinor: -5000, currency: "NGN" },
        { accountId: "b", amountMinor: 5000, currency: "NGN" },
      ])
    ).not.toThrow();
  });

  it("accepts a balanced multi-leg journal (fee split)", () => {
    expect(() =>
      assertBalanced([
        { accountId: "wallet", amountMinor: -10000, currency: "NGN" },
        { accountId: "vendor", amountMinor: 9500, currency: "NGN" },
        { accountId: "revenue", amountMinor: 500, currency: "NGN" },
      ])
    ).not.toThrow();
  });

  it("rejects an unbalanced journal (money from nothing)", () => {
    expect(() =>
      assertBalanced([{ accountId: "wallet", amountMinor: 5000, currency: "NGN" }])
    ).toThrow(LedgerImbalanceError);
  });

  it("rejects when one currency balances but another doesn't", () => {
    expect(() =>
      assertBalanced([
        { accountId: "a", amountMinor: -5000, currency: "NGN" },
        { accountId: "b", amountMinor: 5000, currency: "NGN" },
        { accountId: "c", amountMinor: 100, currency: "USD" },
      ])
    ).toThrow(LedgerImbalanceError);
  });

  it("rejects non-integer amounts", () => {
    expect(() =>
      assertBalanced([
        { accountId: "a", amountMinor: -50.5, currency: "NGN" },
        { accountId: "b", amountMinor: 50.5, currency: "NGN" },
      ])
    ).toThrow(NonIntegerAmountError);
  });

  it("rejects an empty journal", () => {
    expect(() => assertBalanced([])).toThrow();
  });
});
