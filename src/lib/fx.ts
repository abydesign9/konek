// Mock fixed rate — replace with a live FX feed when a real USD rail
// (Reloadly, USD wallet funding) exists. All ledger movement stays in NGN
// until then; USD is display-only.
export const NGN_PER_USD = 1600;

export function usdMinorToNgnMinor(usdMinor: number): number {
  return Math.round(usdMinor * NGN_PER_USD);
}
