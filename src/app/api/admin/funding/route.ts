import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { query } from "@/lib/db";

// Wallet funding that never landed: payments that are still open or failed. These
// are the ones an admin cross-checks against Paystack when the gateway timed out
// but the customer was charged.
export async function GET() {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await assertPermission(admin.role, "funding.approve");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const { rows } = await query(
    `SELECT t.id, t.status, t.currency, t.amount_minor, t.created_at,
            u.full_name, u.email, u.phone
       FROM transactions t
       JOIN users u ON u.id = t.user_id
      WHERE t.type = 'fund_wallet'
        AND t.status <> 'delivered'
        AND t.created_at > now() - interval '30 days'
      ORDER BY t.created_at DESC
      LIMIT 100`
  );
  return NextResponse.json({
    funding: rows.map((r) => ({ ...r, amount_minor: Number(r.amount_minor) })),
  });
}
