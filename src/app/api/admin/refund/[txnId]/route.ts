import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { refundTransaction, TransactionNotRefundableError } from "@/lib/ledger/refund";

export async function POST(_req: Request, { params }: { params: { txnId: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    // Refunds move money out — gate on the finance capability, not just a session.
    await assertPermission(admin.role, "refunds.issue");
    const result = await refundTransaction(params.txnId, admin.email);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof TransactionNotRefundableError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
