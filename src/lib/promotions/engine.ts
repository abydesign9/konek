// Pure promotions logic — no DB, fully testable. Decides audience eligibility,
// whether a locked reward's unlock conditions are met, and cashback amounts.
// Money is integer minor units throughout.

export interface Promo {
  id: string;
  promoType: string;
  rewardType: string;
  targetAudience: "NG" | "INTL" | "ALL";
  rewardAmountMinor: number;
  rewardCurrency: string;
  cashbackPct: number | null;
  minDepositMinor: number;
  minSpendMinor: number;
  validSpendTypes: string[];
  milestoneMinor: number | null;
  startDate: string;
  endDate: string | null;
  userCap: number | null;
  budgetCapMinor: number | null;
  totalClaimed: number;
  totalPaidOutMinor: number;
  status: string;
}

// Is the promo live right now (active + within its window + budget left)?
export function isLive(promo: Promo, now: Date = new Date()): boolean {
  if (promo.status !== "active") return false;
  if (new Date(promo.startDate) > now) return false;
  if (promo.endDate && new Date(promo.endDate) < now) return false;
  if (promo.budgetCapMinor != null && promo.totalPaidOutMinor >= promo.budgetCapMinor) return false;
  return true;
}

// Country NG maps to the NG audience; everyone else is INTL. ALL matches both.
export function audienceMatches(promo: Promo, countryCode: string): boolean {
  if (promo.targetAudience === "ALL") return true;
  const isNg = countryCode.toUpperCase() === "NG";
  return promo.targetAudience === (isNg ? "NG" : "INTL");
}

// A user can claim if the promo is live, matches their audience, the per-user cap
// isn't reached (claimsByUser), and granting one more reward won't blow the
// budget cap.
export function canClaim(
  promo: Promo,
  countryCode: string,
  claimsByUser: number,
  now: Date = new Date()
): boolean {
  if (!isLive(promo, now)) return false;
  if (!audienceMatches(promo, countryCode)) return false;
  if (promo.userCap != null && claimsByUser >= promo.userCap) return false;
  if (
    promo.budgetCapMinor != null &&
    promo.totalPaidOutMinor + promo.rewardAmountMinor > promo.budgetCapMinor
  ) {
    return false;
  }
  return true;
}

// A locked reward unlocks once BOTH thresholds are met. Zero thresholds mean the
// reward is effectively instant.
export function unlockSatisfied(
  promo: Pick<Promo, "minDepositMinor" | "minSpendMinor">,
  depositProgressMinor: number,
  spendProgressMinor: number
): boolean {
  return depositProgressMinor >= promo.minDepositMinor && spendProgressMinor >= promo.minSpendMinor;
}

// Only spend of a configured type counts toward a promo's unlock. Empty list =
// any spend counts.
export function spendCounts(promo: Pick<Promo, "validSpendTypes">, spendType: string): boolean {
  return promo.validSpendTypes.length === 0 || promo.validSpendTypes.includes(spendType);
}

// Cashback for a card transaction, rounded down so we never over-pay.
export function cashbackMinor(promo: Pick<Promo, "cashbackPct">, txnAmountMinor: number): number {
  if (!promo.cashbackPct || promo.cashbackPct <= 0 || txnAmountMinor <= 0) return 0;
  return Math.floor((txnAmountMinor * promo.cashbackPct) / 100);
}
