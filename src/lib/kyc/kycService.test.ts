import { describe, expect, it, vi, beforeEach } from "vitest";

// KYC payloads are envelope-encrypted before storage (see src/lib/crypto/pii.ts),
// which needs a master key. Provide a deterministic test key.
process.env.PII_MASTER_KEY = Buffer.alloc(32, 7).toString("base64");

interface MockUser {
  kyc_tier: number;
  kyc_status: string;
  bvn_verified: boolean;
  nin_verified: boolean;
  liveness_verified: boolean;
}

let user: MockUser;
let duplicateFlags: unknown[];
let fraudQueue: unknown[];
let kycChecks: { result: string; type: string }[];

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => {}) }));

vi.mock("@/lib/db", () => ({
  query: vi.fn(async (text: string, params: unknown[]) => {
    if (text.includes("SELECT kyc_tier, kyc_status")) {
      return { rows: [user] };
    }
    if (text.includes("FROM risk_flags WHERE user_id")) {
      return { rows: duplicateFlags };
    }
    if (text.startsWith("INSERT INTO kyc_checks")) {
      kycChecks.push({ type: String(params[1]), result: String(params[4]) });
      return { rows: [] };
    }
    if (text.includes("UPDATE users")) {
      // params: [userId, tier] — replicate GREATEST(kyc_tier, tier)
      const targetTier = Number(params[1]);
      user.kyc_tier = Math.max(user.kyc_tier, targetTier);
      user.kyc_status = "verified";
      if (text.includes("bvn_verified")) user.bvn_verified = true;
      if (text.includes("nin_verified")) user.nin_verified = true;
      if (text.includes("liveness_verified")) user.liveness_verified = true;
      return { rows: [] };
    }
    if (text.startsWith("INSERT INTO risk_flags")) {
      duplicateFlags.push(params);
      return { rows: [{ id: `flag-${duplicateFlags.length}` }] };
    }
    if (text.startsWith("INSERT INTO fraud_queue")) {
      fraudQueue.push(params);
      return { rows: [] };
    }
    throw new Error(`unexpected query: ${text}`);
  }),
}));

const { submitIdentity, submitLiveness, VerificationFailedError, DuplicateFaceError, KycStepOutOfOrderError } =
  await import("./kycService");
const { registerKnownFace } = await import("@/vendors/kyc/mockDojah");

describe("kycService", () => {
  beforeEach(() => {
    user = {
      kyc_tier: 0,
      kyc_status: "none",
      bvn_verified: false,
      nin_verified: false,
      liveness_verified: false,
    };
    duplicateFlags = [];
    fraudQueue = [];
    kycChecks = [];
  });

  it("promotes a valid BVN to tier 1", async () => {
    const status = await submitIdentity("u1", "bvn", "12345678901");
    expect(status.tier).toBe(1);
    expect(status.bvnVerified).toBe(true);
    expect(status.status).toBe("verified");
  });

  it("rejects a malformed NIN and does not change tier", async () => {
    await expect(submitIdentity("u1", "nin", "123")).rejects.toThrow(VerificationFailedError);
    expect(user.kyc_tier).toBe(0);
    expect(kycChecks.at(-1)).toEqual({ type: "nin", result: "fail" });
  });

  it("blocks liveness before identity is verified", async () => {
    await expect(submitLiveness("u1")).rejects.toThrow(KycStepOutOfOrderError);
  });

  it("promotes a tier-1 user to tier 2 on a clean liveness check", async () => {
    user.kyc_tier = 1;
    const status = await submitLiveness("u1", "selfie_unique_1");
    expect(status.tier).toBe(2);
    expect(status.livenessVerified).toBe(true);
  });

  it("flags a duplicate face, queues it for review, and does not promote", async () => {
    registerKnownFace("shared_face", "someone_else");
    user.kyc_tier = 1;
    await expect(submitLiveness("u1", "shared_face")).rejects.toThrow(DuplicateFaceError);
    expect(user.kyc_tier).toBe(1); // not promoted
    expect(duplicateFlags).toHaveLength(1);
    expect(fraudQueue).toHaveLength(1);
  });
});
