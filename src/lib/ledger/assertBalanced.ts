import { LedgerEntryInput, LedgerImbalanceError, NonIntegerAmountError } from "./types";

// Application-layer mirror of the DB's balanced-journal trigger — fails fast
// before opening a transaction. The DB trigger remains the source of truth.
export function assertBalanced(entries: LedgerEntryInput[]): void {
  if (entries.length === 0) {
    throw new Error("A journal must have at least one entry");
  }

  const sumsByCurrency = new Map<string, number>();

  for (const entry of entries) {
    if (!Number.isInteger(entry.amountMinor)) {
      throw new NonIntegerAmountError(entry.amountMinor);
    }
    sumsByCurrency.set(
      entry.currency,
      (sumsByCurrency.get(entry.currency) ?? 0) + entry.amountMinor
    );
  }

  for (const [currency, sum] of sumsByCurrency) {
    if (sum !== 0) {
      throw new LedgerImbalanceError(currency, sum);
    }
  }
}
