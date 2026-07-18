// Pure pricing/margin logic — no DB, fully testable. All amounts are integer
// minor units; all rates are basis points (1 bp = 0.01%).
export const BPS = 10_000;

export interface PricingRule {
  markupBps: number; // added over provider cost to derive the selling price
  minMarginBps: number; // fail-closed floor on gross margin
}

// Selling price derived from provider cost via markup, rounded to whole minor units.
export function applyMarkup(costMinor: number, rule: PricingRule): number {
  return Math.round((costMinor * (BPS + rule.markupBps)) / BPS);
}

// Gross margin on the selling price, in bps. A non-positive price is treated as
// a total breach so it can never pass the min-margin check.
export function grossMarginBps(costMinor: number, priceMinor: number): number {
  if (priceMinor <= 0) return -BPS;
  return Math.round(((priceMinor - costMinor) / priceMinor) * BPS);
}

export interface PriceDecision {
  publish: boolean; // false => fail-closed: keep existing catalog pricing
  priceMinor: number; // the selling price that would/should apply
  marginBps: number;
  reason?: string;
}

// Decides the selling price for a plan given the new provider cost. Fail-closed:
// if the resulting gross margin is below the rule's minimum, do NOT publish —
// the platform must never automatically sell below (or too close to) cost.
// A locked price is a manual override that sync must not overwrite; it is still
// margin-checked, so a cost spike against a locked price also fails closed.
export function decidePrice(input: {
  costMinor: number;
  rule: PricingRule;
  lockedPriceMinor?: number | null;
}): PriceDecision {
  const price =
    input.lockedPriceMinor != null ? input.lockedPriceMinor : applyMarkup(input.costMinor, input.rule);
  const marginBps = grossMarginBps(input.costMinor, price);
  if (marginBps < input.rule.minMarginBps) {
    return { publish: false, priceMinor: price, marginBps, reason: "below_min_margin" };
  }
  return { publish: true, priceMinor: price, marginBps };
}
