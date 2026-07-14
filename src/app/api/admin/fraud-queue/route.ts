import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";

export async function GET() {
  if (!isAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { rows } = await query(
    `SELECT fq.id, fq.priority, fq.status, fq.notes, fq.created_at, fq.assigned_admin_id,
            rf.flag, rf.detail, u.phone
     FROM fraud_queue fq
     JOIN risk_flags rf ON rf.id = fq.risk_flag_id
     JOIN users u ON u.id = rf.user_id
     ORDER BY
       CASE fq.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       fq.created_at DESC
     LIMIT 50`
  );
  return NextResponse.json({ items: rows });
}
