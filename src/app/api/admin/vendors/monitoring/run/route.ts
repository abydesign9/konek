import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { refreshVendorHealth } from "@/vendors/registry";
import { logAudit } from "@/lib/audit";

// Manual "Run check now" on the Provider Monitoring page — same
// refreshVendorHealth() the cron worker calls every 5 minutes, just
// triggered on demand. Gated behind vendors.manage since it's the same
// capability as toggling a vendor's health by hand.
export async function POST() {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    await assertPermission(admin.role, "vendors.manage");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  await refreshVendorHealth();
  await logAudit(admin.email, "vendor_health_check_manual");

  return NextResponse.json({ ok: true });
}
