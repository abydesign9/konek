import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  budget_minor: string | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  spent_minor: string; // rollup of linked bulk_batches' total_amount_minor
  batch_count: string;
}

export async function listCampaigns(businessId: string): Promise<Campaign[]> {
  const { rows } = await query<Campaign>(
    `SELECT c.id, c.name, c.description, c.budget_minor, c.currency, c.start_date, c.end_date, c.status, c.created_at,
            COALESCE(SUM(b.total_amount_minor), 0) AS spent_minor,
            COUNT(b.id) AS batch_count
     FROM business_campaigns c
     LEFT JOIN bulk_batches b ON b.campaign_id = c.id
     WHERE c.business_account_id = $1
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
    [businessId]
  );
  return rows;
}

export async function createCampaign(
  businessId: string,
  actorUserId: string,
  input: { name: string; description?: string; budgetMinor?: number; startDate?: string; endDate?: string }
): Promise<{ id: string }> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO business_campaigns (business_account_id, created_by, name, description, budget_minor, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      businessId,
      actorUserId,
      input.name.trim().slice(0, 120),
      input.description?.trim().slice(0, 500) || null,
      input.budgetMinor ?? null,
      input.startDate || null,
      input.endDate || null,
    ]
  );
  await logAudit(actorUserId, "campaign_created", "business_campaign", rows[0].id, { businessId, name: input.name });
  return { id: rows[0].id };
}

export async function setCampaignStatus(campaignId: string, businessId: string, actorUserId: string, status: "active" | "completed" | "archived"): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE business_campaigns SET status = $3 WHERE id = $1 AND business_account_id = $2`,
    [campaignId, businessId, status]
  );
  if (rowCount) await logAudit(actorUserId, "campaign_status_changed", "business_campaign", campaignId, { businessId, status });
  return !!rowCount;
}

// Verifies a campaign belongs to the business before it can be linked to a
// new distribution — same ownership check every business resource needs.
export async function assertCampaignOwnedByBusiness(campaignId: string, businessId: string): Promise<void> {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM business_campaigns WHERE id = $1 AND business_account_id = $2`,
    [campaignId, businessId]
  );
  if (!rows[0]) throw new Error("Campaign not found");
}
