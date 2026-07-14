import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await query(
    `UPDATE fraud_queue SET assigned_admin_id = $2, status = 'in_review' WHERE id = $1`,
    [params.id, admin.adminUserId]
  );
  await logAudit(admin.email, "fraud_queue_assigned", "fraud_queue", params.id);
  return NextResponse.json({ ok: true });
}
