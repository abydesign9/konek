import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { txnId: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { rows } = await query<{
    token: string | null;
    status: string;
    recipient: { network: string; planExternalId?: string };
    created_at: string;
  }>(
    `SELECT token, status, recipient, created_at FROM transactions
     WHERE id = $1 AND user_id = $2 AND type = 'esim'`,
    [params.txnId, userId]
  );
  const txn = rows[0];
  if (!txn) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (txn.status !== "delivered") {
    return NextResponse.json({ error: "eSIM not yet issued" }, { status: 409 });
  }

  // No real eSIM management API is wired up yet — deterministic mock usage
  // derived from the activation token so the UI has something real to show.
  const seed = (txn.token ?? "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const usedMb = seed % 3000;
  const totalMb = 5000;

  return NextResponse.json({
    iccid: txn.token,
    country: txn.recipient.network,
    plan: txn.recipient.planExternalId,
    usedMb,
    totalMb,
    remainingMb: Math.max(totalMb - usedMb, 0),
    activatedAt: txn.created_at,
  });
}
