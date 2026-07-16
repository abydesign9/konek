import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendExternalAlert } from "@/lib/alerts/externalAlert";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const healthy = body?.healthy;
  if (typeof healthy !== "boolean") {
    return NextResponse.json({ error: "healthy (boolean) is required" }, { status: 400 });
  }

  try {
    await assertPermission(admin.role, "vendors.manage");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const { rows: before } = await query<{ healthy: boolean }>(`SELECT healthy FROM vendors WHERE id = $1`, [params.id]);

  await query(`UPDATE vendors SET healthy = $2, last_health_check = now() WHERE id = $1`, [
    params.id,
    healthy,
  ]);
  await logAudit(admin.email, "vendor_health_toggled", "vendor", params.id, { healthy });

  if (before[0]?.healthy && !healthy) {
    await sendExternalAlert("provider_outage", `${params.id} marked unhealthy by ${admin.email}`, { vendor: params.id });
  }

  return NextResponse.json({ ok: true });
}
