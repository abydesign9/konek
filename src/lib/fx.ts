// Mock fixed rate — replace with a live FX feed when a real USD rail
// (Reloadly, USD wallet funding) exists. All ledger movement stays in NGN
// until then; USD is display-only.
export const NGN_PER_USD = 1600;

export function usdMinorToNgnMinor(usdMinor: number): number {
  return Math.round(usdMinor * NGN_PER_USD);
}

// Konek's revenue on USD→NGN conversion is the FX spread: the user is credited
// naira at a rate slightly below mid-market, and Konek keeps the difference
// (realized as it holds the USD). 1.5% is the mock spread.
export const USD_NGN_SPREAD = 0.015;

// NGN (kobo) a user receives for converting a given amount of USD (cents),
// after the spread. Floored so we never over-credit by a fraction of a kobo.
export function usdMinorToNgnMinorUserRate(usdMinor: number): number {
  return Math.floor(usdMinor * NGN_PER_USD * (1 - USD_NGN_SPREAD));
}
