import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { syncSupplierViaApi } from "@/lib/marketplace/import";

// API sync: pull a supplier's live catalogue via its registered adapter and
// import it. For large catalogues this should be moved to a background job; kept
// synchronous here so the console shows the result immediately.
export async function POST(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await assertPermission(admin.role, "rates.edit");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const b = await req.json().catch(() => null);
  const supplierId = String(b?.supplierId ?? "").trim();
  if (!supplierId) return NextResponse.json({ error: "supplierId is required" }, { status: 400 });

  try {
    const result = await syncSupplierViaApi(supplierId, admin.adminUserId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "sync failed" }, { status: 400 });
  }
}
