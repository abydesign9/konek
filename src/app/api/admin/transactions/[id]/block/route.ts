import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// Block a transaction the admin believes is fraud. Raises a risk flag and pushes
// it to the fraud queue for review, and — if the transaction is still open
// (initiated/pending_vendor) — fails it so no value moves. A transaction that
// already delivered can't be silently reversed here; it's flagged for a proper
// refund/reversal instead.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await assertPermission(admin.role, "fraud.review");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const b = await req.json().catch(() => ({}));
  const reason = typeof b?.reason === "string" && b.reason.trim() ? b.reason.trim() : "Blocked by admin (suspected fraud)";

  const { rows } = await query<{ user_id: string; status: string }>(
    `SELECT user_id, status FROM transactions WHERE id = $1`,
    [params.id]
  );
  const txn = rows[0];
  if (!txn) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

  const { rows: flag } = await query<{ id: string }>(
    `INSERT INTO risk_flags (user_id, flag, detail) VALUES ($1, 'transaction_blocked', $2) RETURNING id`,
    [txn.user_id, JSON.stringify({ transactionId: params.id, reason })]
  );
  await query(`INSERT INTO fraud_queue (risk_flag_id, priority) VALUES ($1, 'high')`, [flag[0].id]);

  const stopped = txn.status === "initiated" || txn.status === "pending_vendor";
  if (stopped) {
    await query(`UPDATE transactions SET status = 'failed', failure_reason = $2, updated_at = now() WHERE id = $1`, [
      params.id,
      reason,
    ]);
    await query(`INSERT INTO transaction_events (txn_id, from_status, to_status, detail) VALUES ($1, $2, 'failed', $3)`, [
      params.id,
      txn.status,
      JSON.stringify({ blockedBy: admin.adminUserId, reason }),
    ]);
  }

  await logAudit(admin.adminUserId, "transaction_blocked", "transaction", params.id, {
    reason,
    stopped,
    previousStatus: txn.status,
  });

  return NextResponse.json({
    ok: true,
    stopped,
    message: stopped
      ? "Transaction blocked and failed before any value moved."
      : "Transaction flagged for review. It had already progressed, so raise a refund/reversal if needed.",
  });
}
