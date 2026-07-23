// Pricing engine. The customer price is DERIVED from the lowest supplier cost by
// a tiered markup — never typed in — unless an admin sets an explicit override or
// promo. All money is minor units (USD cents for eSIM).

export interface PricingRule {
  id: string;
  name: string;
  minCostMinor: number;
  maxCostMinor: number | null; // null = no upper bound
  markupPct: number;
  category?: string | null;
  country?: string | null;
  supplierId?: string | null;
  priority: number;
  active: boolean;
}

export interface PriceContext {
  category?: string | null;
  country?: string | null;
  supplierId?: string | null;
}

export interface PriceResult {
  costMinor: number;
  priceMinor: number;
  markupPct: number;
  marginMinor: number; // price - cost
  marginPct: number; // margin / price
  appliedRuleId: string | null;
  appliedRuleName: string;
  source: "rule" | "markup_override" | "price_override" | "promo" | "no_rule";
}

// A rule matches when its cost band contains the cost AND its optional scope
// (category/country/supplier) matches. More-specific rules score higher, so a
// "Nigeria eSIM" rule beats a global band even at the same priority.
function ruleMatches(rule: PricingRule, cost: number, ctx: PriceContext): boolean {
  if (!rule.active) return false;
  if (cost < rule.minCostMinor) return false;
  if (rule.maxCostMinor != null && cost >= rule.maxCostMinor) return false;
  if (rule.category && rule.category !== ctx.category) return false;
  if (rule.country && rule.country !== ctx.country) return false;
  if (rule.supplierId && rule.supplierId !== ctx.supplierId) return false;
  return true;
}

function specificity(rule: PricingRule): number {
  return (rule.supplierId ? 4 : 0) + (rule.country ? 2 : 0) + (rule.category ? 1 : 0);
}

export function selectRule(rules: PricingRule[], cost: number, ctx: PriceContext): PricingRule | null {
  const matching = rules.filter((r) => ruleMatches(r, cost, ctx));
  if (matching.length === 0) return null;
  // Highest priority, then most specific, then tightest band, deterministic.
  matching.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (specificity(b) !== specificity(a)) return specificity(b) - specificity(a);
    const aw = (a.maxCostMinor ?? Number.MAX_SAFE_INTEGER) - a.minCostMinor;
    const bw = (b.maxCostMinor ?? Number.MAX_SAFE_INTEGER) - b.minCostMinor;
    if (aw !== bw) return aw - bw;
    return a.id.localeCompare(b.id);
  });
  return matching[0];
}

function withMargins(costMinor: number, priceMinor: number, markupPct: number, base: Partial<PriceResult>): PriceResult {
  const marginMinor = priceMinor - costMinor;
  return {
    costMinor,
    priceMinor,
    markupPct,
    marginMinor,
    marginPct: priceMinor > 0 ? marginMinor / priceMinor : 0,
    appliedRuleId: base.appliedRuleId ?? null,
    appliedRuleName: base.appliedRuleName ?? "",
    source: base.source ?? "rule",
  };
}

// Round UP to the cent (already minor) so a markup never rounds us below cost.
function applyMarkup(costMinor: number, markupPct: number): number {
  return Math.ceil(costMinor * (1 + markupPct / 100));
}

export interface Overrides {
  priceOverrideMinor?: number | null;
  markupOverridePct?: number | null;
  promoPriceMinor?: number | null;
  overrideExpiresAt?: string | Date | null;
}

function overrideActive(o: Overrides, now: Date): boolean {
  if (!o.overrideExpiresAt) return true; // no expiry = permanent
  return new Date(o.overrideExpiresAt) > now;
}

// The engine. Precedence: promo > fixed price override > markup override > tiered
// rule > bare cost (no rule). Overrides lapse at overrideExpiresAt.
export function computePrice(
  costMinor: number,
  rules: PricingRule[],
  ctx: PriceContext = {},
  overrides: Overrides = {},
  now: Date = new Date()
): PriceResult {
  const active = overrideActive(overrides, now);

  if (active && overrides.promoPriceMinor != null && overrides.promoPriceMinor > 0) {
    const p = overrides.promoPriceMinor;
    return withMargins(costMinor, p, costMinor ? ((p - costMinor) / costMinor) * 100 : 0, {
      source: "promo",
      appliedRuleName: "Promotion",
    });
  }
  if (active && overrides.priceOverrideMinor != null && overrides.priceOverrideMinor > 0) {
    const p = overrides.priceOverrideMinor;
    return withMargins(costMinor, p, costMinor ? ((p - costMinor) / costMinor) * 100 : 0, {
      source: "price_override",
      appliedRuleName: "Fixed price override",
    });
  }
  if (active && overrides.markupOverridePct != null) {
    const pct = overrides.markupOverridePct;
    return withMargins(costMinor, applyMarkup(costMinor, pct), pct, {
      source: "markup_override",
      appliedRuleName: "Markup override",
    });
  }

  const rule = selectRule(rules, costMinor, ctx);
  if (!rule) {
    // No band configured — sell at cost and flag it (never below cost, never free).
    return withMargins(costMinor, Math.max(costMinor, 1), 0, { source: "no_rule", appliedRuleName: "No pricing rule" });
  }
  return withMargins(costMinor, applyMarkup(costMinor, rule.markupPct), rule.markupPct, {
    source: "rule",
    appliedRuleId: rule.id,
    appliedRuleName: rule.name,
  });
}
