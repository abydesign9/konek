import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { encryptJson } from "@/lib/crypto/pii";
import { sendExternalAlert } from "@/lib/alerts/externalAlert";
import { getMethodAdapter } from "@/vendors/kyc/methodAdapters";
import { loadMethods, loadProviders, loadRequirements, selectProvider } from "./config";
import { computeTier, missingForTier } from "./tierEngine";
import { KYC_TIER, TIER_LABEL } from "./tiers";

// Global KYC orchestration. Verifies a single method through the provider routed
// for the user's country, records it in user_verifications, then RECOMPUTES the
// user's tier from the requirement matrix. Nigeria's BVN/NIN/selfie columns are
// kept in sync for back-compat but no longer drive the tier.

const aad = (userId: string) => `user_verifications:${userId}`;

export class UnknownMethodError extends Error {
  constructor(method: string) {
    super(`Unknown or inactive verification method: ${method}`);
    this.name = "UnknownMethodError";
  }
}
export class NoProviderError extends Error {
  constructor(method: string, country: string) {
    super(`No verification provider is available for ${method} in ${country}`);
    this.name = "NoProviderError";
  }
}
export class MethodVerificationFailedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "MethodVerificationFailedError";
  }
}
export class DuplicateFaceError extends Error {
  constructor() {
    super("This face is already linked to another Konek account");
    this.name = "DuplicateFaceError";
  }
}

async function getUserCountry(userId: string): Promise<string> {
  const { rows } = await query<{ country_code: string }>(`SELECT country_code FROM users WHERE id = $1`, [userId]);
  return (rows[0]?.country_code ?? "NG").toUpperCase();
}

async function verifiedMethodsFor(userId: string): Promise<string[]> {
  const { rows } = await query<{ method: string }>(
    `SELECT method FROM user_verifications WHERE user_id = $1 AND status = 'verified'`,
    [userId]
  );
  return rows.map((r) => r.method);
}

// Back-compat: keep the legacy boolean columns aligned for NG methods.
const LEGACY_COLUMN: Record<string, string> = {
  bvn: "bvn_verified",
  nin: "nin_verified",
  selfie_liveness: "liveness_verified",
};

async function recomputeTier(userId: string): Promise<number> {
  const [country, verified, requirements] = await Promise.all([
    getUserCountry(userId),
    verifiedMethodsFor(userId),
    loadRequirements(),
  ]);
  const tier = computeTier(requirements, country, verified);
  await query(
    `UPDATE users
        SET kyc_tier = GREATEST(kyc_tier, $2),
            kyc_status = CASE WHEN $2 >= 1 THEN 'verified' ELSE kyc_status END,
            updated_at = now()
      WHERE id = $1`,
    [userId, tier]
  );
  return tier;
}

export interface VerifyMethodInput {
  userId: string;
  method: string;
  value?: string;
  imageRef?: string;
  documentRef?: string;
}

export interface VerifyMethodResult {
  method: string;
  status: "verified";
  tier: number;
  provider: string;
}

export async function verifyMethod(input: VerifyMethodInput): Promise<VerifyMethodResult> {
  const { userId, method } = input;

  const methods = await loadMethods();
  const meta = methods.find((m) => m.code === method && m.active);
  if (!meta) throw new UnknownMethodError(method);

  // Server-side format guard for number lookups — never trust the client and
  // don't spend on a vendor lookup for a malformed value.
  if (meta.kind === "number_lookup" && meta.validationRegex) {
    if (!input.value || !new RegExp(meta.validationRegex).test(input.value)) {
      await logAudit(userId, "kyc_method_failed", "user", userId, { method, reason: "malformed" });
      throw new MethodVerificationFailedError(`${meta.label} format is invalid`);
    }
  }

  const country = await getUserCountry(userId);
  const providers = await loadProviders();
  const provider = selectProvider(providers, country, method);
  if (!provider) throw new NoProviderError(method, country);

  const adapter = getMethodAdapter(provider.adapterKey);
  if (!adapter) throw new NoProviderError(method, country);

  const check = await adapter.verify({
    method,
    country,
    userId,
    value: input.value,
    imageRef: input.imageRef,
    documentRef: input.documentRef,
  });

  // Audit trail for every attempt (kyc_checks), payload encrypted at rest.
  await query(
    `INSERT INTO kyc_checks (user_id, check_type, vendor, vendor_ref, result, raw_response, raw_response_encrypted)
     VALUES ($1, $2, $3, $4, $5, NULL, $6)`,
    [
      userId,
      method,
      provider.id,
      check.vendorRef,
      check.result === "pass" ? "pass" : "fail",
      JSON.stringify(encryptJson(check.raw, aad(userId))),
    ]
  );

  if (check.duplicate) {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO risk_flags (user_id, flag, detail) VALUES ($1, 'duplicate_photo', $2) RETURNING id`,
      [userId, JSON.stringify({ vendorRef: check.vendorRef, method })]
    );
    await query(`INSERT INTO fraud_queue (risk_flag_id, priority) VALUES ($1, 'high')`, [rows[0].id]);
    await logAudit(userId, "kyc_method_duplicate", "user", userId, { method, vendorRef: check.vendorRef });
    throw new DuplicateFaceError();
  }

  if (check.result !== "pass") {
    await logAudit(userId, "kyc_method_failed", "user", userId, { method, vendorRef: check.vendorRef });
    // A provider fraud/mismatch verdict freezes the account for review.
    if (check.fraud) await freezeUserForFraud(userId, check.reason ?? `Provider flagged ${method} as fraudulent/mismatched`);
    throw new MethodVerificationFailedError(check.reason ?? `${meta.label} verification failed`);
  }

  // Record (or refresh) the per-method verification.
  await query(
    `INSERT INTO user_verifications (user_id, method, status, provider, vendor_ref, detail_encrypted, verified_at)
     VALUES ($1, $2, 'verified', $3, $4, $5, now())
     ON CONFLICT (user_id, method) DO UPDATE
       SET status = 'verified', provider = EXCLUDED.provider, vendor_ref = EXCLUDED.vendor_ref,
           detail_encrypted = EXCLUDED.detail_encrypted, verified_at = now(), updated_at = now()`,
    [userId, method, provider.id, check.vendorRef, JSON.stringify(encryptJson(check.raw, aad(userId)))]
  );

  const legacy = LEGACY_COLUMN[method];
  if (legacy) {
    await query(`UPDATE users SET ${legacy} = true, updated_at = now() WHERE id = $1`, [userId]);
  }

  const tier = await recomputeTier(userId);
  await logAudit(userId, "kyc_method_verified", "user", userId, { method, provider: provider.id, tier });
  return { method, status: "verified", tier, provider: provider.id };
}

// What the customer sees: their country, verified methods, current tier, and —
// per target tier — which method groups (with labels) are still missing and
// which provider/method options they can use. Drives the country-aware UI.
// Apply an async provider decision delivered by webhook (Sumsub, Smile ID,
// Onfido... complete verification out-of-band). Records the per-method status
// and recomputes the tier. A real integration re-fetches the decision from the
// provider by reference before calling this; the webhook body is only a trigger.
// A provider flagged the identity as fraudulent or mismatched. Freeze the
// account (suspend + revoke sessions so no money can move), raise a high-priority
// risk flag + fraud-queue item, and alert admin. Reversible from Admin > Customers.
export async function freezeUserForFraud(userId: string, reason: string): Promise<void> {
  await query(`UPDATE users SET status = 'suspended', updated_at = now() WHERE id = $1 AND status = 'active'`, [userId]);
  await query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
  const { rows } = await query<{ id: string }>(
    `INSERT INTO risk_flags (user_id, flag, detail) VALUES ($1, 'kyc_fraud', $2) RETURNING id`,
    [userId, JSON.stringify({ reason })]
  );
  await query(`INSERT INTO fraud_queue (risk_flag_id, priority) VALUES ($1, 'high')`, [rows[0].id]);
  await logAudit(userId, "kyc_fraud_freeze", "user", userId, { reason });
  await sendExternalAlert("fraud_score_high", `KYC fraud/mismatch — account ${userId} frozen: ${reason}`, { userId });
}

export class UnverifiedKycIntegrationError extends Error {
  constructor() {
    super(
      "KYC_WEBHOOK_VERIFIED_INTEGRATION is not set to 'true' — a 'verified' decision from a webhook " +
        "cannot be trusted without the provider integration re-fetching and confirming it server-side " +
        "first. See the comment on applyKycWebhookResult."
    );
    this.name = "UnverifiedKycIntegrationError";
  }
}

export async function applyKycWebhookResult(input: {
  userId: string;
  method: string;
  decision: "verified" | "rejected";
  provider?: string;
  vendorRef?: string;
  fraud?: boolean;
}): Promise<{ tier: number }> {
  // A "rejected" or fraud-flagged decision only removes trust (redo
  // verification / freeze for review) — safe to apply on payload alone. A
  // "verified" decision GRANTS trust (tier upgrade, higher limits, dollar
  // account access), so it must never be taken from an unauthenticated
  // webhook payload alone: anyone who could forge or replay this event
  // (a leaked KYC_WEBHOOK_SECRET, a compromised provider account) could
  // upgrade an arbitrary user's KYC tier. No real KYC provider is wired to
  // re-fetch and confirm the decision server-side yet (see the module
  // comment above), so this is hard-gated behind an explicit env flag that
  // must be turned on deliberately once that re-fetch call is added —
  // never as a side effect of just setting KYC_WEBHOOK_SECRET.
  if (input.decision === "verified" && process.env.KYC_WEBHOOK_VERIFIED_INTEGRATION !== "true") {
    throw new UnverifiedKycIntegrationError();
  }

  const methods = await loadMethods();
  if (!methods.some((m) => m.code === input.method)) throw new UnknownMethodError(input.method);

  await query(
    `INSERT INTO user_verifications (user_id, method, status, provider, vendor_ref, verified_at)
     VALUES ($1, $2, $3, $4, $5, CASE WHEN $3 = 'verified' THEN now() ELSE NULL END)
     ON CONFLICT (user_id, method) DO UPDATE
       SET status = EXCLUDED.status, provider = EXCLUDED.provider, vendor_ref = EXCLUDED.vendor_ref,
           verified_at = EXCLUDED.verified_at, updated_at = now()`,
    [input.userId, input.method, input.decision, input.provider ?? null, input.vendorRef ?? null]
  );

  const legacy = LEGACY_COLUMN[input.method];
  if (legacy && input.decision === "verified") {
    await query(`UPDATE users SET ${legacy} = true, updated_at = now() WHERE id = $1`, [input.userId]);
  }

  const tier = await recomputeTier(input.userId);
  await logAudit(input.userId, "kyc_webhook_applied", "user", input.userId, {
    method: input.method,
    decision: input.decision,
    provider: input.provider,
    tier,
  });

  // A fraud/mismatch verdict freezes the account for review.
  if (input.fraud) await freezeUserForFraud(input.userId, `Provider flagged ${input.method} as fraudulent/mismatched`);

  return { tier };
}

export interface KycOverview {
  country: string;
  tier: number;
  tierLabel: string;
  verifiedMethods: string[];
  requirements: {
    tier: number;
    label: string;
    satisfied: boolean;
    missingGroups: { methods: { code: string; label: string; kind: string }[] }[];
  }[];
}

export async function getKycOverview(userId: string): Promise<KycOverview> {
  const [country, verified, requirements, methods] = await Promise.all([
    getUserCountry(userId),
    verifiedMethodsFor(userId),
    loadRequirements(),
    loadMethods(),
  ]);
  const tier = computeTier(requirements, country, verified);
  const methodMeta = (code: string) => {
    const m = methods.find((x) => x.code === code);
    return { code, label: m?.label ?? code, kind: m?.kind ?? "document" };
  };

  const relevant = requirements
    .filter((r) => (r.countryCode?.toUpperCase() ?? null) === country || r.countryCode === null)
    .map((r) => r.tier);
  const tiers = [...new Set(relevant)].sort((a, b) => a - b);

  const requirementViews = tiers.map((t) => {
    const missing = missingForTier(requirements, country, verified, t)
      // only the groups introduced at exactly this tier vs lower — dedupe by showing per-tier
      .map((group) => ({ methods: group.map(methodMeta) }));
    return {
      tier: t,
      label: TIER_LABEL[t] ?? `Tier ${t}`,
      satisfied: tier >= t,
      missingGroups: tier >= t ? [] : missing,
    };
  });

  return {
    country,
    tier,
    tierLabel: TIER_LABEL[tier] ?? `Tier ${tier}`,
    verifiedMethods: verified,
    requirements: requirementViews,
  };
}

export { KYC_TIER };
