import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { refundTransaction, TransactionNotRefundableError } from "@/lib/ledger/refund";

export async function POST(_req: Request, { params }: { params: { txnId: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const result = await refundTransaction(params.txnId, admin.email);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TransactionNotRefundableError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
