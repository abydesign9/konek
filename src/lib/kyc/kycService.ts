import { query } from "@/lib/db";
import { IdentityType } from "@/vendors/kyc/types";
import { KYC_TIER } from "./tiers";
import {
  verifyMethod,
  DuplicateFaceError as MethodDuplicateFaceError,
  MethodVerificationFailedError,
} from "./verificationService";

export class VerificationFailedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "VerificationFailedError";
  }
}

export class DuplicateFaceError extends Error {
  constructor() {
    super("This face is already linked to another Konek account");
    this.name = "DuplicateFaceError";
  }
}

export class KycStepOutOfOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KycStepOutOfOrderError";
  }
}

export interface KycStatus {
  tier: number;
  status: string; // none|pending|verified|rejected
  bvnVerified: boolean;
  ninVerified: boolean;
  livenessVerified: boolean;
  duplicateFlag: boolean;
}

export async function getKycStatus(userId: string): Promise<KycStatus> {
  const { rows } = await query<{
    kyc_tier: number;
    kyc_status: string;
    bvn_verified: boolean;
    nin_verified: boolean;
    liveness_verified: boolean;
  }>(
    `SELECT kyc_tier, kyc_status, bvn_verified, nin_verified, liveness_verified FROM users WHERE id = $1`,
    [userId]
  );
  const u = rows[0];
  const { rows: dupRows } = await query<{ id: string }>(
    `SELECT id FROM risk_flags WHERE user_id = $1 AND flag = 'duplicate_photo' AND resolved = false LIMIT 1`,
    [userId]
  );
  return {
    tier: u?.kyc_tier ?? 0,
    status: u?.kyc_status ?? "none",
    bvnVerified: u?.bvn_verified ?? false,
    ninVerified: u?.nin_verified ?? false,
    livenessVerified: u?.liveness_verified ?? false,
    duplicateFlag: dupRows.length > 0,
  };
}

// Tier 1 identity via BVN/NIN. Kept as a thin Nigeria-facing wrapper over the
// global engine (verifyMethod) so the existing /api/kyc/identity route and its
// error contract are unchanged, while tier is now computed from the requirement
// matrix rather than hardcoded here.
export async function submitIdentity(
  userId: string,
  type: IdentityType,
  value: string
): Promise<KycStatus> {
  try {
    await verifyMethod({ userId, method: type, value });
  } catch (err) {
    if (err instanceof MethodVerificationFailedError) throw new VerificationFailedError(err.message);
    throw err;
  }
  return getKycStatus(userId);
}

// Liveness / selfie check. Requires transact tier first so the biometric is
// always tied to a verified identity, then runs the global engine (which grants
// finance tier only if the country's matrix is satisfied).
export async function submitLiveness(userId: string, imageRef?: string): Promise<KycStatus> {
  const current = await getKycStatus(userId);
  if (current.tier < KYC_TIER.TRANSACT) {
    throw new KycStepOutOfOrderError("Verify your identity before the liveness check");
  }
  try {
    await verifyMethod({ userId, method: "selfie_liveness", imageRef });
  } catch (err) {
    if (err instanceof MethodDuplicateFaceError) throw new DuplicateFaceError();
    if (err instanceof MethodVerificationFailedError) throw new VerificationFailedError(err.message);
    throw err;
  }
  return getKycStatus(userId);
}
