// Amounts are integers in minor units (kobo/cents) — never floats.
export interface LedgerEntryInput {
  accountId: string;
  amountMinor: number;
  currency: string;
}

export type JournalType =
  | "reservation"
  | "settlement"
  | "release"
  | "refund"
  | "funding"
  | "reward"
  | "adjustment"
  | "purchase"
  | "promo_bonus"
  | "promo_unlock"
  | "transfer";

export interface PostJournalInput {
  txnId?: string;
  description: string;
  entries: LedgerEntryInput[];
  journalType?: JournalType;
}

export class LedgerImbalanceError extends Error {
  constructor(currency: string, sum: number) {
    super(`Unbalanced journal for ${currency}: entries sum to ${sum}, expected 0`);
    this.name = "LedgerImbalanceError";
  }
}

export class NonIntegerAmountError extends Error {
  constructor(amountMinor: number) {
    super(`amount_minor must be an integer, got ${amountMinor}`);
    this.name = "NonIntegerAmountError";
  }
}
