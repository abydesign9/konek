// Pure tier computation — no DB, fully testable. A user's KYC tier is derived
// from the methods they have verified, checked against the requirement matrix
// for their country. This is the heart of the global model: BVN/NIN are not
// special, they are just methods that happen to appear in Nigeria's rules.

export interface Requirement {
  countryCode: string | null; // null = global fallback
  tier: number;
  // AND of ORs: every group must have at least one verified method.
  methodGroups: string[][];
  label?: string | null;
  active?: boolean;
}

// For a given country, pick the effective requirement per tier: a country-specific
// row wins over the global (null) fallback. Returns one Requirement per tier.
export function resolveRequirements(all: Requirement[], countryCode: string): Requirement[] {
  const cc = countryCode.toUpperCase();
  const byTier = new Map<number, Requirement>();
  for (const r of all) {
    if (r.active === false) continue;
    const scope = r.countryCode?.toUpperCase() ?? null;
    if (scope !== null && scope !== cc) continue; // not this country and not global
    const existing = byTier.get(r.tier);
    // Country-specific beats global; if both are country/both global, first wins.
    if (!existing || (existing.countryCode === null && scope === cc)) {
      byTier.set(r.tier, r);
    }
  }
  return [...byTier.values()].sort((a, b) => a.tier - b.tier);
}

function satisfies(req: Requirement, verified: Set<string>): boolean {
  return req.methodGroups.every((group) => group.some((m) => verified.has(m)));
}

// The highest tier whose requirement is satisfied. Tiers are cumulative: a tier
// only counts if every lower defined tier is also satisfied (you can't be
// "finance" without meeting "transact"). Baseline is always 0 (browse).
export function computeTier(all: Requirement[], countryCode: string, verifiedMethods: Iterable<string>): number {
  const verified = new Set(verifiedMethods);
  const reqs = resolveRequirements(all, countryCode); // ascending by tier
  let tier = 0;
  for (const req of reqs) {
    if (satisfies(req, verified)) tier = req.tier;
    else break; // cumulative — stop at the first unmet tier
  }
  return tier;
}

// What's still missing to reach a target tier: the groups not yet satisfied,
// each with its acceptable methods. Powers the customer "what to verify" UI.
export function missingForTier(
  all: Requirement[],
  countryCode: string,
  verifiedMethods: Iterable<string>,
  targetTier: number
): string[][] {
  const verified = new Set(verifiedMethods);
  const reqs = resolveRequirements(all, countryCode).filter((r) => r.tier <= targetTier);
  const missing: string[][] = [];
  for (const req of reqs) {
    for (const group of req.methodGroups) {
      if (!group.some((m) => verified.has(m))) missing.push(group);
    }
  }
  return missing;
}
