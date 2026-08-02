import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendExternalAlert } from "@/lib/alerts/externalAlert";

export class AlreadyHasBusinessError extends Error {
  constructor() {
    super("This account already has a business application");
    this.name = "AlreadyHasBusinessError";
  }
}

export async function applyAsBusiness(
  ownerUserId: string,
  legalName: string,
  regNumber: string | null,
  businessType: string
): Promise<{ businessAccountId: string }> {
  const { rows: existing } = await query<{ id: string }>(
    `SELECT id FROM business_accounts WHERE owner_user_id = $1`,
    [ownerUserId]
  );
  if (existing[0]) throw new AlreadyHasBusinessError();

  const { rows } = await query<{ id: string }>(
    `INSERT INTO business_accounts (owner_user_id, legal_name, reg_number, business_type) VALUES ($1, $2, $3, $4) RETURNING id`,
    [ownerUserId, legalName, regNumber, businessType]
  );
  await logAudit(ownerUserId, "business_apply", "business_account", rows[0].id, { businessType });
  await sendExternalAlert("kyc_pending", `New business (KYB) application: ${legalName}`, { businessAccountId: rows[0].id, businessType });
  return { businessAccountId: rows[0].id };
}

export async function approveBusiness(businessAccountId: string, adminActor: string): Promise<void> {
  await query(`UPDATE business_accounts SET kyb_status = 'verified' WHERE id = $1`, [businessAccountId]);
  await logAudit(adminActor, "business_approved", "business_account", businessAccountId);
}

const KYB_STATUSES = ["pending", "verified", "suspended", "rejected"] as const;
export type KybStatus = (typeof KYB_STATUSES)[number];

export function isKybStatus(v: unknown): v is KybStatus {
  return typeof v === "string" && (KYB_STATUSES as readonly string[]).includes(v);
}

// Moderate a business account's KYB status (suspend / reject / reinstate). The
// business's own gating reads kyb_status, so this immediately restricts a
// suspended/rejected business from business-only features.
export async function setBusinessKybStatus(
  businessAccountId: string,
  status: KybStatus,
  adminActor: string
): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE business_accounts SET kyb_status = $2 WHERE id = $1`,
    [businessAccountId, status]
  );
  if (!rowCount) return false;
  await logAudit(adminActor, "business_kyb_status_changed", "business_account", businessAccountId, { status });
  return true;
}
