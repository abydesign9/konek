import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

const VALID_STATUSES = ["resolved", "escalated"];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { status, notes } = body ?? {};
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of ${VALID_STATUSES.join(", ")}` }, { status: 400 });
  }

  try {
    await assertPermission(admin.role, "fraud.review");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  await query(
    `UPDATE fraud_queue SET status = $2, notes = $3, resolved_at = now() WHERE id = $1`,
    [params.id, status, notes ?? null]
  );
  await logAudit(admin.email, "fraud_queue_resolved", "fraud_queue", params.id, { status, notes });
  return NextResponse.json({ ok: true });
}
