import { query } from "@/lib/db";
import { purchaseVtu, InsufficientBalanceError } from "@/lib/purchases/purchaseVtuService";
import { logAudit } from "@/lib/audit";
import { VendorServiceType } from "@/vendors/types";

export class BusinessNotVerifiedError extends Error {
  constructor() {
    super("Business account must be KYB-verified before running bulk batches");
    this.name = "BusinessNotVerifiedError";
  }
}

interface BulkItemInput {
  serviceType: VendorServiceType;
  network: string;
  phone: string;
  amountMinor: number;
}

export async function createBulkBatch(
  businessAccountId: string,
  uploadedBy: string,
  purpose: string,
  items: BulkItemInput[]
): Promise<{ batchId: string }> {
  const { rows: bizRows } = await query<{ kyb_status: string }>(
    `SELECT kyb_status FROM business_accounts WHERE id = $1`,
    [businessAccountId]
  );
  if (bizRows[0]?.kyb_status !== "verified") throw new BusinessNotVerifiedError();

  const totalAmountMinor = items.reduce((sum, i) => sum + i.amountMinor, 0);

  const { rows } = await query<{ id: string }>(
    `INSERT INTO bulk_batches (business_account_id, purpose, total_items, total_amount_minor, currency, uploaded_by, status)
     VALUES ($1, $2, $3, $4, 'NGN', $5, 'validated') RETURNING id`,
    [businessAccountId, purpose, items.length, totalAmountMinor, uploadedBy]
  );
  const batchId = rows[0].id;

  for (const item of items) {
    await query(
      `INSERT INTO bulk_batch_items (batch_id, recipient) VALUES ($1, $2)`,
      [batchId, JSON.stringify(item)]
    );
  }

  await logAudit(uploadedBy, "bulk_batch_created", "bulk_batch", batchId, { purpose, itemCount: items.length });
  return { batchId };
}

// Processes every pending item sequentially, charging the business owner's
// personal wallet via the same purchaseVtu() path as a retail purchase — no
// separate money-movement code path for bulk. Stops recording per-item
// results as it goes so a partial failure doesn't lose progress.
export async function processBulkBatch(batchId: string): Promise<{ delivered: number; failed: number }> {
  const { rows: batchRows } = await query<{ business_account_id: string; status: string }>(
    `SELECT business_account_id, status FROM bulk_batches WHERE id = $1`,
    [batchId]
  );
  const batch = batchRows[0];
  if (!batch) throw new Error("Batch not found");

  const { rows: bizRows } = await query<{ owner_user_id: string }>(
    `SELECT owner_user_id FROM business_accounts WHERE id = $1`,
    [batch.business_account_id]
  );
  const ownerUserId = bizRows[0].owner_user_id;

  await query(`UPDATE bulk_batches SET status = 'processing' WHERE id = $1`, [batchId]);

  const { rows: items } = await query<{ id: string; recipient: BulkItemInput }>(
    `SELECT id, recipient FROM bulk_batch_items WHERE batch_id = $1 AND status = 'pending'`,
    [batchId]
  );

  let delivered = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const result = await purchaseVtu({
        userId: ownerUserId,
        idempotencyKey: `bulk:${batchId}:${item.id}`,
        serviceType: item.recipient.serviceType,
        network: item.recipient.network,
        phone: item.recipient.phone,
        amountMinor: item.recipient.amountMinor,
      });

      if (result.status === "delivered") {
        await query(`UPDATE bulk_batch_items SET status = 'delivered', txn_id = $2 WHERE id = $1`, [
          item.id,
          result.txnId,
        ]);
        delivered += 1;
      } else {
        await query(`UPDATE bulk_batch_items SET status = 'failed', txn_id = $2, error = 'vendor_declined' WHERE id = $1`, [
          item.id,
          result.txnId,
        ]);
        failed += 1;
      }
    } catch (err) {
      const message = err instanceof InsufficientBalanceError ? "insufficient_balance" : (err instanceof Error ? err.message : "unknown_error");
      await query(`UPDATE bulk_batch_items SET status = 'failed', error = $2 WHERE id = $1`, [item.id, message]);
      failed += 1;
    }
  }

  await query(
    `UPDATE bulk_batches SET status = $2, completed_at = now() WHERE id = $1`,
    [batchId, failed === 0 ? "completed" : "completed"]
  );

  return { delivered, failed };
}
