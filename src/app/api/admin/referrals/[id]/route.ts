import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// Moderate a referral conversion. The only destructive action is rejecting a
// suspicious referral so it never pays out. Already-paid conversions are left
// alone (reversing a paid reward needs a ledger clawback, done separately).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    await assertPermission(admin.role, "referrals.manage");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const body = await req.json().catch(() => null);
  const status = body?.status;
  if (status !== "rejected" && status !== "pending") {
    return NextResponse.json({ error: "status must be rejected or pending" }, { status: 400 });
  }

  const { rowCount } = await query(
    `UPDATE referral_conversions SET status = $2 WHERE id = $1 AND status <> 'paid'`,
    [params.id, status]
  );
  if (!rowCount) {
    return NextResponse.json({ error: "conversion not found or already paid" }, { status: 404 });
  }
  await logAudit(admin.adminUserId, "referral_conversion_moderated", "referral_conversion", params.id, { status });
  return NextResponse.json({ ok: true });
}
