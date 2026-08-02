import crypto from "node:crypto";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export type ApiKeyMode = "sandbox" | "live";

export interface ApiKeySummary {
  id: string;
  label: string;
  key_prefix: string;
  mode: ApiKeyMode;
  status: string;
  last_used_at: string | null;
  created_at: string;
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function listApiKeys(businessId: string): Promise<ApiKeySummary[]> {
  const { rows } = await query<ApiKeySummary>(
    `SELECT id, label, key_prefix, mode, status, last_used_at, created_at
     FROM business_api_keys WHERE business_account_id = $1 ORDER BY created_at DESC`,
    [businessId]
  );
  return rows;
}

// Generates a key, stores only its hash, and returns the plaintext ONCE — same
// principle as a password: the business must copy it now, it's unrecoverable
// after this call returns.
export async function createApiKey(
  businessId: string,
  actorUserId: string,
  label: string,
  mode: ApiKeyMode
): Promise<{ id: string; key: string }> {
  const raw = crypto.randomBytes(24).toString("base64url");
  const key = `knk_${mode}_${raw}`;
  const prefix = key.slice(0, 16) + "…";

  const { rows } = await query<{ id: string }>(
    `INSERT INTO business_api_keys (business_account_id, created_by, label, key_prefix, key_hash, mode)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [businessId, actorUserId, label.trim().slice(0, 80), prefix, hashKey(key), mode]
  );
  await logAudit(actorUserId, "business_api_key_created", "business_api_key", rows[0].id, { businessId, mode, label });
  return { id: rows[0].id, key };
}

export async function revokeApiKey(keyId: string, businessId: string, actorUserId: string): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE business_api_keys SET status = 'revoked', revoked_at = now() WHERE id = $1 AND business_account_id = $2 AND status = 'active'`,
    [keyId, businessId]
  );
  if (rowCount) await logAudit(actorUserId, "business_api_key_revoked", "business_api_key", keyId, { businessId });
  return !!rowCount;
}

export interface AuthenticatedApiKey {
  id: string;
  businessAccountId: string;
  mode: ApiKeyMode;
}

// Verifies a bearer key against its stored hash and returns the owning
// business, or null if missing/invalid/revoked. Never logs or echoes the key.
export async function authenticateApiKey(rawKey: string): Promise<AuthenticatedApiKey | null> {
  const { rows } = await query<{ id: string; business_account_id: string; mode: ApiKeyMode }>(
    `SELECT id, business_account_id, mode FROM business_api_keys WHERE key_hash = $1 AND status = 'active'`,
    [hashKey(rawKey)]
  );
  const row = rows[0];
  if (!row) return null;
  await query(`UPDATE business_api_keys SET last_used_at = now() WHERE id = $1`, [row.id]);
  return { id: row.id, businessAccountId: row.business_account_id, mode: row.mode };
}

export async function logApiRequest(apiKeyId: string, method: string, path: string, statusCode: number, detail: Record<string, unknown> = {}): Promise<void> {
  await query(
    `INSERT INTO business_api_requests (business_api_key_id, method, path, status_code, detail) VALUES ($1, $2, $3, $4, $5)`,
    [apiKeyId, method, path, statusCode, JSON.stringify(detail)]
  );
}

export async function listApiRequests(businessId: string) {
  const { rows } = await query(
    `SELECT r.id, r.method, r.path, r.status_code, r.created_at, k.label AS key_label
     FROM business_api_requests r
     JOIN business_api_keys k ON k.id = r.business_api_key_id
     WHERE k.business_account_id = $1
     ORDER BY r.created_at DESC
     LIMIT 50`,
    [businessId]
  );
  return rows;
}
