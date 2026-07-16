import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { createBulkBatch, processBulkBatch, BusinessNotVerifiedError } from "@/lib/bulk/bulkBatchService";
import { VendorServiceType } from "@/vendors/types";

export class NotFoundError extends Error {
  constructor() {
    super("Recurring distribution not found");
    this.name = "NotFoundError";
  }
}

interface Recipient {
  phone: string;
  network: string;
}

export interface RecurringDistributionRow {
  id: string;
  business_account_id: string;
  created_by: string;
  purpose: string;
  service_type: string;
  amount_minor_per_recipient: string;
  recipients: Recipient[];
  interval_days: number;
  next_run_at: string;
  active: boolean;
  last_run_at: string | null;
  last_status: string | null;
  created_at: string;
}

export async function listRecurringDistributions(businessAccountId: string): Promise<RecurringDistributionRow[]> {
  const { rows } = await query<RecurringDistributionRow>(
    `SELECT * FROM recurring_distributions WHERE business_account_id = $1 AND active = true ORDER BY created_at DESC`,
    [businessAccountId]
  );
  return rows;
}

export async function createRecurringDistribution(
  businessAccountId: string,
  createdBy: string,
  input: {
    purpose: string;
    serviceType: VendorServiceType;
    amountMinorPerRecipient: number;
    recipients: Recipient[];
    intervalDays: number;
  }
): Promise<{ id: string }> {
  const nextRunAt = new Date(Date.now() + input.intervalDays * 24 * 60 * 60 * 1000);
  const { rows } = await query<{ id: string }>(
    `INSERT INTO recurring_distributions
       (business_account_id, created_by, purpose, service_type, amount_minor_per_recipient, recipients, interval_days, next_run_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [
      businessAccountId,
      createdBy,
      input.purpose,
      input.serviceType,
      input.amountMinorPerRecipient,
      JSON.stringify(input.recipients),
      input.intervalDays,
      nextRunAt,
    ]
  );
  await logAudit(createdBy, "recurring_distribution_created", "recurring_distribution", rows[0].id, {
    purpose: input.purpose,
    recipientCount: input.recipients.length,
  });
  return { id: rows[0].id };
}

export async function cancelRecurringDistribution(id: string, businessAccountId: string, actorId: string): Promise<void> {
  const { rowCount } = await query(
    `UPDATE recurring_distributions SET active = false, updated_at = now() WHERE id = $1 AND business_account_id = $2`,
    [id, businessAccountId]
  );
  if (!rowCount) throw new NotFoundError();
  await logAudit(actorId, "recurring_distribution_cancelled", "recurring_distribution", id);
}

// Called from the cron tick. Each due schedule spins up a real bulk_batch
// (the exact same table an on-demand upload creates) and runs it through
// the existing processBulkBatch charge path — no separate money-movement
// code for the recurring case.
export async function dispatchDueRecurringDistributions(): Promise<{ dispatched: number }> {
  const { rows: due } = await query<RecurringDistributionRow>(
    `SELECT * FROM recurring_distributions WHERE active = true AND next_run_at <= now()`
  );

  let dispatched = 0;
  for (const schedule of due) {
    const nextRunAt = new Date(Date.now() + schedule.interval_days * 24 * 60 * 60 * 1000);
    let status = "delivered";
    try {
      const items = schedule.recipients.map((r) => ({
        serviceType: schedule.service_type as VendorServiceType,
        network: r.network,
        phone: r.phone,
        amountMinor: Number(schedule.amount_minor_per_recipient),
      }));
      const { batchId } = await createBulkBatch(schedule.business_account_id, schedule.created_by /* actor recorded, owner pays */, schedule.purpose, items);
      const { delivered, failed } = await processBulkBatch(batchId);
      status = failed === 0 ? "delivered" : delivered === 0 ? "failed" : "partial";
      dispatched++;
    } catch (err) {
      status = err instanceof BusinessNotVerifiedError ? "skipped_kyb" : "failed";
    }
    await query(
      `UPDATE recurring_distributions SET last_run_at = now(), last_status = $2, next_run_at = $3, updated_at = now() WHERE id = $1`,
      [schedule.id, status, nextRunAt]
    );
  }
  return { dispatched };
}
