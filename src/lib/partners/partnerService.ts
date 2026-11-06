import crypto from "node:crypto";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

// Returns the raw key exactly once — like every real API key issuance flow,
// we only ever store the hash. Lose it, generate a new one.
export async function createPartnerAccount(
  businessAccountId: string,
  partnerName: string,
  revenueSharePct: number,
  allowedServices: string[],
  adminActor: string
): Promise<{ partnerId: string; apiKey: string }> {
  const rawKey = `raviion_live_${crypto.randomBytes(24).toString("hex")}`;
  const apiKeyHash = hashApiKey(rawKey);

  const { rows } = await query<{ id: string }>(
    `INSERT INTO partner_accounts (business_account_id, partner_name, api_key_hash, revenue_share_pct, allowed_services)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [businessAccountId, partnerName, apiKeyHash, revenueSharePct, allowedServices]
  );
  await logAudit(adminActor, "partner_account_created", "partner_account", rows[0].id, { partnerName });

  return { partnerId: rows[0].id, apiKey: rawKey };
}

export interface AuthenticatedPartner {
  id: string;
  businessAccountId: string;
  ownerUserId: string;
  revenueSharePct: number;
  allowedServices: string[];
}

export async function authenticatePartner(rawKey: string): Promise<AuthenticatedPartner | null> {
  const apiKeyHash = hashApiKey(rawKey);
  const { rows } = await query<{
    id: string;
    business_account_id: string;
    owner_user_id: string;
    revenue_share_pct: string;
    allowed_services: string[];
  }>(
    `SELECT pa.id, pa.business_account_id, ba.owner_user_id, pa.revenue_share_pct, pa.allowed_services
     FROM partner_accounts pa
     JOIN business_accounts ba ON ba.id = pa.business_account_id
     WHERE pa.api_key_hash = $1 AND pa.status = 'active'`,
    [apiKeyHash]
  );
  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    businessAccountId: row.business_account_id,
    ownerUserId: row.owner_user_id,
    revenueSharePct: Number(row.revenue_share_pct),
    allowedServices: row.allowed_services,
  };
}
