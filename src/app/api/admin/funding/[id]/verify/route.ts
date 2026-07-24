import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { creditFromPayment } from "@/lib/wallet/creditFromPayment";

// Manually reconcile a funding payment. This re-verifies the reference with
// Paystack (never trusts the admin's word on whether it succeeded) and credits
// the wallet exactly once — the same trusted, idempotent path the webhook uses.
// If Paystack still reports the payment as unsuccessful, nothing is credited.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await assertPermission(admin.role, "funding.approve");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const { rows: before } = await query<{ id: string; type: string }>(
    `SELECT id, type FROM transactions WHERE id = $1`,
    [params.id]
  );
  if (!before[0] || before[0].type !== "fund_wallet") {
    return NextResponse.json({ error: "Funding transaction not found" }, { status: 404 });
  }

  await creditFromPayment(params.id);

  const { rows: after } = await query<{ status: string }>(`SELECT status FROM transactions WHERE id = $1`, [params.id]);
  const status = after[0]?.status ?? "unknown";
  await logAudit(admin.adminUserId, "funding_manual_verify", "transaction", params.id, { resultStatus: status });

  return NextResponse.json({
    status,
    credited: status === "delivered",
    message:
      status === "delivered"
        ? "Verified with Paystack and wallet credited."
        : "Paystack does not report this payment as successful, so nothing was credited.",
  });
}
