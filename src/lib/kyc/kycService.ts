import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { encryptJson } from "@/lib/crypto/pii";
import { mockDojahAdapter } from "@/vendors/kyc/mockDojah";
import { IdentityType, KycAdapter } from "@/vendors/kyc/types";
import { KYC_TIER } from "./tiers";

const adapter: KycAdapter = mockDojahAdapter;

// Binds each encrypted payload to its owner so a blob can't be lifted between
// records; the same aad is required to decrypt (see src/lib/crypto/pii.ts).
const kycAad = (userId: string) => `kyc_checks:${userId}`;

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

// Tier 1: verify a BVN or NIN. Either one is sufficient to reach the transact
// tier, per the progressive-KYC spec.
export async function submitIdentity(
  userId: string,
  type: IdentityType,
  value: string
): Promise<KycStatus> {
  // Both BVN and NIN are 11 digits. Reject malformed input before spending on a
  // vendor lookup — a typo storm shouldn't rack up KYC cost (also see the
  // per-user rate limit on the route). We still record the failed attempt so
  // every KYC attempt leaves an audit trail, just without a paid lookup.
  if (!/^\d{11}$/.test(value)) {
    await query(
      `INSERT INTO kyc_checks (user_id, check_type, vendor, vendor_ref, result, raw_response, raw_response_encrypted)
       VALUES ($1, $2, $3, $4, $5, NULL, $6)`,
      [
        userId,
        type,
        adapter.id,
        null,
        "fail",
        JSON.stringify(encryptJson({ reason: "malformed", length: value.length }, kycAad(userId))),
      ]
    );
    await logAudit(userId, "kyc_identity_failed", "user", userId, { type, reason: "malformed" });
    throw new VerificationFailedError(`${type.toUpperCase()} must be 11 digits`);
  }

  const check = await adapter.verifyIdentity({ type, value, userId });

  await query(
    `INSERT INTO kyc_checks (user_id, check_type, vendor, vendor_ref, result, raw_response, raw_response_encrypted)
     VALUES ($1, $2, $3, $4, $5, NULL, $6)`,
    [
      userId,
      type,
      adapter.id,
      check.vendorRef,
      check.result === "pass" ? "pass" : "fail",
      JSON.stringify(encryptJson(check.raw, kycAad(userId))),
    ]
  );

  if (check.result !== "pass") {
    await logAudit(userId, "kyc_identity_failed", "user", userId, { type, vendorRef: check.vendorRef });
    throw new VerificationFailedError(check.reason ?? `${type.toUpperCase()} verification failed`);
  }

  const column = type === "bvn" ? "bvn_verified" : "nin_verified";
  // Reaching transact tier is idempotent: verifying the second ID later never
  // downgrades an already-higher tier (e.g. a tier-2 user adding a NIN).
  await query(
    `UPDATE users
     SET ${column} = true,
         kyc_tier = GREATEST(kyc_tier, $2),
         kyc_status = 'verified',
         updated_at = now()
     WHERE id = $1`,
    [userId, KYC_TIER.TRANSACT]
  );
  await logAudit(userId, "kyc_identity_verified", "user", userId, { type, vendorRef: check.vendorRef });
  return getKycStatus(userId);
}

// Fraud-only liveness and duplicate-face check. It does not grant a KYC tier.
// Requires transact tier first so the check is always linked to a verified identity.
export async function submitLiveness(userId: string, imageRef?: string): Promise<KycStatus> {
  const current = await getKycStatus(userId);
  if (current.tier < KYC_TIER.TRANSACT) {
    throw new KycStepOutOfOrderError("Verify your BVN or NIN before the liveness check");
  }

  const check = await adapter.verifyLiveness({ userId, imageRef });

  await query(
    `INSERT INTO kyc_checks (user_id, check_type, vendor, vendor_ref, result, raw_response, raw_response_encrypted)
     VALUES ($1, 'liveness', $2, $3, $4, NULL, $5)`,
    [
      userId,
      adapter.id,
      check.vendorRef,
      check.result === "pass" ? "pass" : "fail",
      JSON.stringify(encryptJson(check.raw, kycAad(userId))),
    ]
  );

  if (check.duplicate) {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO risk_flags (user_id, flag, detail) VALUES ($1, 'duplicate_photo', $2) RETURNING id`,
      [userId, JSON.stringify({ vendorRef: check.vendorRef })]
    );
    await query(`INSERT INTO fraud_queue (risk_flag_id, priority) VALUES ($1, 'high')`, [rows[0].id]);
    await logAudit(userId, "kyc_liveness_duplicate", "user", userId, { vendorRef: check.vendorRef });
    throw new DuplicateFaceError();
  }

  if (check.result !== "pass") {
    await logAudit(userId, "kyc_liveness_failed", "user", userId, { vendorRef: check.vendorRef });
    throw new VerificationFailedError(check.reason ?? "Liveness check failed — try again in good light");
  }

  await query(
    `UPDATE users
     SET liveness_verified = true,
         updated_at = now()
     WHERE id = $1`,
    [userId]
  );
  await logAudit(userId, "kyc_liveness_verified", "user", userId, { vendorRef: check.vendorRef });
  return getKycStatus(userId);
}
