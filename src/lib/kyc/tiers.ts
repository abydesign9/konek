import { query } from "@/lib/db";

// Progressive KYC tiers (mirrors users.kyc_tier).
//   0 browse   — signed up, can look around, no money movement
//   1 transact — BVN or NIN verified → fund wallet, local VTU, intl top-up, eSIM
//   2 finance  — liveness verified → USD account, virtual card
//   9 business — CAC + director verification (Business Hub)
export const KYC_TIER = {
  BROWSE: 0,
  TRANSACT: 1,
  FINANCE: 2,
  BUSINESS: 9,
} as const;

export const TIER_LABEL: Record<number, string> = {
  0: "Browse",
  1: "Verified",
  2: "Finance",
  9: "Business",
};

// Thrown when an action needs a higher tier than the user currently holds.
// Routes translate this into a 403 with a code the UI uses to send the user
// to /kyc — gating lives at the route/middleware layer, not in the ledger.
export class KycGateError extends Error {
  readonly code = "kyc_tier_too_low";
  constructor(readonly requiredTier: number, readonly currentTier: number) {
    super(
      `This action needs KYC tier ${requiredTier} (${TIER_LABEL[requiredTier] ?? requiredTier}); you are tier ${currentTier}`
    );
    this.name = "KycGateError";
  }
}

export async function getUserTier(userId: string): Promise<number> {
  const { rows } = await query<{ kyc_tier: number }>(`SELECT kyc_tier FROM users WHERE id = $1`, [userId]);
  return rows[0]?.kyc_tier ?? 0;
}

export async function assertKycTier(userId: string, requiredTier: number): Promise<void> {
  const tier = await getUserTier(userId);
  if (tier < requiredTier) throw new KycGateError(requiredTier, tier);
}
