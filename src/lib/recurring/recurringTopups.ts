import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { usdMinorToNgnMinor } from "@/lib/fx";
import { assertKycTier, KYC_TIER, KycGateError } from "@/lib/kyc/tiers";
import { InsufficientBalanceError, purchaseVtu } from "@/lib/purchases/purchaseVtuService";
import { NoHealthyVendorError } from "@/vendors/registry";

export class NotFoundError extends Error {
  constructor() {
    super("Recurring top-up not found");
    this.name = "NotFoundError";
  }
}

// Same USD presets the on-demand intl top-up form enforces — recurring
// schedules are not a way around that server-side price list.
export const RECURRING_TOPUP_PRESETS_USD_MINOR = [500, 1000, 2000, 5000];

export interface RecurringTopupRow {
  id: string;
  user_id: string;
  phone: string;
  network: string;
  amount_minor: string;
  interval_days: number;
  next_run_at: string;
  active: boolean;
  last_run_at: string | null;
  last_status: string | null;
  created_at: string;
}

export async function listRecurringTopups(userId: string): Promise<RecurringTopupRow[]> {
  const { rows } = await query<RecurringTopupRow>(
    `SELECT * FROM recurring_topups WHERE user_id = $1 AND active = true ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function createRecurringTopup(
  userId: string,
  input: { phone: string; network: string; amountMinor: number; intervalDays: number }
): Promise<{ id: string }> {
  const nextRunAt = new Date(Date.now() + input.intervalDays * 24 * 60 * 60 * 1000);
  const { rows } = await query<{ id: string }>(
    `INSERT INTO recurring_topups (user_id, phone, network, amount_minor, interval_days, next_run_at)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [userId, input.phone, input.network, input.amountMinor, input.intervalDays, nextRunAt]
  );
  await logAudit(userId, "recurring_topup_created", "recurring_topup", rows[0].id, input);
  return { id: rows[0].id };
}

export async function cancelRecurringTopup(id: string, userId: string): Promise<void> {
  const { rowCount } = await query(
    `UPDATE recurring_topups SET active = false, updated_at = now() WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  if (!rowCount) throw new NotFoundError();
  await logAudit(userId, "recurring_topup_cancelled", "recurring_topup", id);
}

// Called from the cron tick — same pattern as dispatchDueCampaigns.
// Every due schedule gets exactly one attempt per tick; failures are
// recorded (last_status) rather than retried in a loop, since the next
// scheduled run is itself the retry.
export async function dispatchDueRecurringTopups(): Promise<{ dispatched: number }> {
  const { rows: due } = await query<RecurringTopupRow>(
    `SELECT * FROM recurring_topups WHERE active = true AND next_run_at <= now()`
  );

  let dispatched = 0;
  for (const schedule of due) {
    const nextRunAt = new Date(Date.now() + schedule.interval_days * 24 * 60 * 60 * 1000);
    let status = "delivered";
    try {
      await assertKycTier(schedule.user_id, KYC_TIER.TRANSACT);
      const amountMinor = Number(schedule.amount_minor);
      const chargeAmountMinor = await usdMinorToNgnMinor(amountMinor);
      await purchaseVtu({
        userId: schedule.user_id,
        idempotencyKey: `recurring_topup:${schedule.id}:${schedule.next_run_at}`,
        serviceType: "intl_topup",
        network: schedule.network,
        phone: schedule.phone,
        amountMinor: chargeAmountMinor,
        recipientExtra: { displayCurrency: "USD", displayAmountMinor: amountMinor },
      });
      dispatched++;
    } catch (err) {
      if (err instanceof InsufficientBalanceError) status = "skipped_balance";
      else if (err instanceof KycGateError) status = "skipped_kyc";
      else if (err instanceof NoHealthyVendorError) status = "failed";
      else status = "failed";
    }
    await query(
      `UPDATE recurring_topups SET last_run_at = now(), last_status = $2, next_run_at = $3, updated_at = now() WHERE id = $1`,
      [schedule.id, status, nextRunAt]
    );
  }
  return { dispatched };
}
