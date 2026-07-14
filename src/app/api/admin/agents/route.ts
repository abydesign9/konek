import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";

export async function GET() {
  if (!isAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { rows } = await query(
    `SELECT a.id, a.tier, a.commission_rate, a.status, u.phone,
            (SELECT COALESCE(SUM(amount_minor), 0) FROM agent_commissions WHERE agent_id = a.id AND paid = false) AS unpaid_minor
     FROM agents a JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC`
  );
  return NextResponse.json({ agents: rows });
}
