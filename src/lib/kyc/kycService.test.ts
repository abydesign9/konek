import { describe, expect, it, vi, beforeEach } from "vitest";

// KYC payloads are envelope-encrypted before storage (see src/lib/crypto/pii.ts),
// which needs a master key. Provide a deterministic test key.
process.env.PII_MASTER_KEY = Buffer.alloc(32, 7).toString("base64");

interface MockUser {
  country_code: string;
  kyc_tier: number;
  kyc_status: string;
  bvn_verified: boolean;
  nin_verified: boolean;
  liveness_verified: boolean;
}

let user: MockUser;
let verifications: { method: string; status: string }[];
let duplicateFlags: unknown[];
let fraudQueue: unknown[];
let kycChecks: { result: string; type: string }[];

// Seeded to mirror db/migrations/0041_global_kyc.sql (NG + global rows).
const METHODS = [
  { code: "bvn", label: "BVN", kind: "number_lookup", validation_regex: "^\\d{11}$", active: true },
  { code: "nin", label: "NIN", kind: "number_lookup", validation_regex: "^\\d{11}$", active: true },
  { code: "selfie_liveness", label: "Selfie", kind: "biometric", validation_regex: null, active: true },
];
const PROVIDERS = [
  { id: "mock_dojah", name: "Dojah", adapter_key: "mock_dojah", countries: ["NG"], methods: ["bvn", "nin", "selfie_liveness"], priority: 10, enabled: true },
];
const REQUIREMENTS = [
  { country_code: null, tier: 1, method_groups: [["passport", "national_id"]], label: null, active: true },
  { country_code: "NG", tier: 1, method_groups: [["bvn", "nin"]], label: null, active: true },
  { country_code: "NG", tier: 2, method_groups: [["bvn", "nin"], ["selfie_liveness"]], label: null, active: true },
];

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => {}) }));

vi.mock("@/lib/db", () => ({
  query: vi.fn(async (text: string, params: unknown[]) => {
    if (text.includes("FROM verification_methods")) return { rows: METHODS };
    if (text.includes("FROM kyc_providers")) return { rows: PROVIDERS };
    if (text.includes("FROM kyc_requirements")) return { rows: REQUIREMENTS };
    if (text.includes("country_code FROM users")) return { rows: [{ country_code: user.country_code }] };
    if (text.includes("SELECT kyc_tier, kyc_status")) return { rows: [user] };
    if (text.includes("method FROM user_verifications")) {
      return { rows: verifications.filter((v) => v.status === "verified").map((v) => ({ method: v.method })) };
    }
    if (text.includes("FROM risk_flags WHERE user_id")) return { rows: duplicateFlags };
    if (text.startsWith("INSERT INTO kyc_checks")) {
      kycChecks.push({ type: String(params[1]), result: String(params[4]) });
      return { rows: [] };
    }
    if (text.startsWith("INSERT INTO user_verifications")) {
      const method = String(params[1]);
      const existing = verifications.find((v) => v.method === method);
      if (existing) existing.status = "verified";
      else verifications.push({ method, status: "verified" });
      return { rows: [] };
    }
    if (text.includes("UPDATE users")) {
      if (text.includes("kyc_tier = GREATEST")) {
        user.kyc_tier = Math.max(user.kyc_tier, Number(params[1]));
        user.kyc_status = user.kyc_tier >= 1 ? "verified" : user.kyc_status;
      }
      if (text.includes("bvn_verified = true")) user.bvn_verified = true;
      if (text.includes("nin_verified = true")) user.nin_verified = true;
      if (text.includes("liveness_verified = true")) user.liveness_verified = true;
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
const { registerKnownFace } = await import("@/vendors/kyc/methodAdapters");

describe("kycService (global engine)", () => {
  beforeEach(() => {
    user = { country_code: "NG", kyc_tier: 0, kyc_status: "none", bvn_verified: false, nin_verified: false, liveness_verified: false };
    verifications = [];
    duplicateFlags = [];
    fraudQueue = [];
    kycChecks = [];
  });

  it("promotes a valid Nigerian BVN to tier 1", async () => {
    const status = await submitIdentity("u1", "bvn", "12345678901");
    expect(status.tier).toBe(1);
    expect(status.bvnVerified).toBe(true);
    expect(status.status).toBe("verified");
  });

  it("rejects a malformed NIN and does not change tier", async () => {
    await expect(submitIdentity("u1", "nin", "123")).rejects.toThrow(VerificationFailedError);
    expect(user.kyc_tier).toBe(0);
    // Malformed input is rejected at the format guard (audit-logged) before any
    // paid vendor lookup, so no kyc_checks row is written.
    expect(kycChecks).toHaveLength(0);
  });

  it("blocks liveness before identity is verified", async () => {
    await expect(submitLiveness("u1")).rejects.toThrow(KycStepOutOfOrderError);
  });

  it("promotes a tier-1 user to tier 2 on a clean liveness check", async () => {
    await submitIdentity("u1", "bvn", "12345678901");
    const status = await submitLiveness("u1", "selfie_unique_1");
    expect(status.tier).toBe(2);
    expect(status.livenessVerified).toBe(true);
  });

  it("flags a duplicate face, queues it for review, and does not promote", async () => {
    registerKnownFace("shared_face", "someone_else");
    await submitIdentity("u1", "bvn", "12345678901");
    await expect(submitLiveness("u1", "shared_face")).rejects.toThrow(DuplicateFaceError);
    expect(user.kyc_tier).toBe(1); // not promoted past transact
    expect(duplicateFlags).toHaveLength(1);
    expect(fraudQueue).toHaveLength(1);
  });
});
