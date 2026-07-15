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
    plan_meta: { dataMb?: number; validityDays?: number } | null;
    created_at: string;
  }>(
    `SELECT t.token, t.status, t.recipient, t.created_at, c.meta AS plan_meta
     FROM transactions t
     LEFT JOIN catalog_items c
       ON c.service_type = 'esim' AND c.external_id = t.recipient->>'planExternalId'
     WHERE t.id = $1 AND t.user_id = $2 AND t.type = 'esim'`,
    [params.txnId, userId]
  );
  const txn = rows[0];
  if (!txn) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (txn.status !== "delivered") {
    return NextResponse.json({ error: "eSIM not yet issued" }, { status: 409 });
  }

  // No real eSIM management API is wired up yet — deterministic mock usage
  // derived from the activation token, scaled to the plan's real allowance.
  const totalMb = txn.plan_meta?.dataMb ?? 5000;
  const seed = (txn.token ?? "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const usedMb = Math.min(seed % totalMb, totalMb);

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
