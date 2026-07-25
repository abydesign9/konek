import { query } from "@/lib/db";
import { sendExternalAlert } from "@/lib/alerts/externalAlert";
import { agentLimitMultiplier } from "@/lib/agents/agentProgram";

export class LimitExceededError extends Error {
  constructor(metric: string, maxMinor: number) {
    super(`This purchase exceeds your ${metric.replace("_", " ")} limit of ₦${(maxMinor / 100).toLocaleString()}`);
    this.name = "LimitExceededError";
  }
}

interface LimitRow {
  metric: string;
  max_minor: string;
}

// Limits live in the `limits` table (keyed by kyc_tier/metric/currency), not
// hardcoded — bumping a tier's cap is a data change, not a deploy. A tier
// with no configured row for a metric is treated as unlimited on that axis.
export async function checkVelocityLimits(
  userId: string,
  amountMinor: number,
  currency: string
): Promise<void> {
  const { rows: userRows } = await query<{ kyc_tier: number; created_at: string }>(
    `SELECT kyc_tier, created_at FROM users WHERE id = $1`,
    [userId]
  );
  const user = userRows[0];
  if (!user) return;

  const { rows: limitRows } = await query<LimitRow>(
    `SELECT metric, max_minor FROM limits WHERE kyc_tier = $1 AND currency = $2`,
    [user.kyc_tier, currency]
  );
  if (limitRows.length === 0) return;

  const limitsByMetric = new Map(limitRows.map((r) => [r.metric, Number(r.max_minor)]));

  // Agents get higher limits (admin-configurable multiplier); 1 for everyone else.
  const multiplier = await agentLimitMultiplier(userId);
  if (multiplier !== 1) {
    for (const [metric, max] of limitsByMetric) limitsByMetric.set(metric, Math.round(max * multiplier));
  }

  const singleTxnMax = limitsByMetric.get("single_txn");
  if (singleTxnMax !== undefined && amountMinor > singleTxnMax) {
    await flagVelocity(userId, "single_txn", amountMinor, singleTxnMax);
    throw new LimitExceededError("single_txn", singleTxnMax);
  }

  const accountAgeHours = (Date.now() - new Date(user.created_at).getTime()) / 3_600_000;
  const isNewAccount = accountAgeHours < 72;
  const dailyMetric = isNewAccount && limitsByMetric.has("new_account_daily")
    ? "new_account_daily"
    : "daily_spend";
  const dailyMax = limitsByMetric.get(dailyMetric);

  if (dailyMax !== undefined) {
    const { rows: spentRows } = await query<{ spent: string | null }>(
      `SELECT SUM(amount_minor) AS spent FROM transactions
       WHERE user_id = $1 AND currency = $2 AND status IN ('delivered', 'pending_vendor', 'initiated')
         AND created_at >= date_trunc('day', now())`,
      [userId, currency]
    );
    const spentToday = spentRows[0]?.spent ? Number(spentRows[0].spent) : 0;
    if (spentToday + amountMinor > dailyMax) {
      await flagVelocity(userId, dailyMetric, spentToday + amountMinor, dailyMax);
      throw new LimitExceededError(dailyMetric, dailyMax);
    }
  }
}

async function flagVelocity(userId: string, metric: string, attemptedMinor: number, maxMinor: number) {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO risk_flags (user_id, flag, detail) VALUES ($1, 'velocity', $2) RETURNING id`,
    [userId, JSON.stringify({ metric, attemptedMinor, maxMinor })]
  );

  // Every risk flag becomes a working item for an operator — priority
  // scales with how far over the limit the attempt was.
  const overBy = attemptedMinor / maxMinor;
  const priority = overBy > 3 ? "critical" : overBy > 1.5 ? "high" : "medium";
  await query(
    `INSERT INTO fraud_queue (risk_flag_id, priority) VALUES ($1, $2)`,
    [rows[0].id, priority]
  );

  if (metric === "single_txn") {
    await sendExternalAlert("large_transaction", `Attempted ₦${(attemptedMinor / 100).toLocaleString()} exceeds single-txn cap of ₦${(maxMinor / 100).toLocaleString()}`, { userId, priority });
  }
  if (priority === "high" || priority === "critical") {
    await sendExternalAlert("fraud_score_high", `${priority.toUpperCase()} velocity flag on ${metric}: ${overBy.toFixed(1)}x the limit`, { userId, metric, priority });
  }
}
