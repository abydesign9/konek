import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendExternalAlert } from "@/lib/alerts/externalAlert";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

// Ops kill switch + maintenance toggle for a provider. `enabled=false` removes
// the provider from routing entirely (state 'disabled'); `maintenance=true`
// declares a maintenance window (state 'maintenance'). Both are honoured by the
// routing policy immediately — no deploy.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const enabled = body?.enabled;
  const maintenance = body?.maintenance;
  if (typeof enabled !== "boolean" && typeof maintenance !== "boolean") {
    return NextResponse.json({ error: "enabled and/or maintenance (boolean) required" }, { status: 400 });
  }

  try {
    await assertPermission(admin.role, "vendors.manage");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const sets: string[] = [];
  const values: unknown[] = [params.id];
  if (typeof enabled === "boolean") {
    values.push(enabled);
    sets.push(`enabled = $${values.length}`);
  }
  if (typeof maintenance === "boolean") {
    values.push(maintenance);
    sets.push(`maintenance = $${values.length}`);
  }

  const { rowCount } = await query(`UPDATE vendors SET ${sets.join(", ")} WHERE id = $1`, values);
  if (rowCount === 0) return NextResponse.json({ error: "vendor not found" }, { status: 404 });

  await logAudit(admin.email, "vendor_control", "vendor", params.id, { enabled, maintenance });
  if (enabled === false) {
    await sendExternalAlert("provider_outage", `${params.id} disabled by ${admin.email}`, { vendor: params.id });
  }

  return NextResponse.json({ ok: true });
}
