import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";

// Agent roster for the admin console: identity, tier/rate, status, float and the
// performance numbers ops needs to approve, tier up, or chase an agent.
// Pending applications sort first so approvals never get buried.
export async function GET() {
  if (!isAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { rows } = await query(
    `SELECT a.id,
            a.tier,
            a.commission_rate,
            a.status,
            a.created_at,
            a.approved_at,
            u.phone,
            u.email,
            u.full_name,
            COALESCE(ab.balance_minor, 0) AS float_minor,
            COALESCE(c.unpaid_minor, 0)   AS unpaid_minor,
            COALESCE(c.paid_minor, 0)     AS paid_minor,
            COALESCE(c.sales, 0)          AS sales,
            COALESCE(c.mtd_minor, 0)      AS mtd_minor
       FROM agents a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN account_balances ab ON ab.account_id = a.float_account_id
       LEFT JOIN LATERAL (
         SELECT COALESCE(SUM(amount_minor) FILTER (WHERE NOT paid), 0) AS unpaid_minor,
                COALESCE(SUM(amount_minor) FILTER (WHERE paid), 0)     AS paid_minor,
                COUNT(*)                                              AS sales,
                COALESCE(SUM(amount_minor) FILTER (WHERE created_at >= date_trunc('month', now())), 0) AS mtd_minor
           FROM agent_commissions WHERE agent_id = a.id
       ) c ON true
      ORDER BY (a.status = 'pending') DESC, a.created_at DESC`
  );

  return NextResponse.json({ agents: rows });
}
