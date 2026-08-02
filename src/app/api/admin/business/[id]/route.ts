import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { setBusinessKybStatus, isKybStatus } from "@/lib/business/businessService";

// Moderate a business account: set kyb_status to suspended / rejected / verified
// / pending. (Approval also has its own POST /approve endpoint.)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await assertPermission(admin.role, "business.approve");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const body = await req.json().catch(() => null);
  if (!isKybStatus(body?.status)) {
    return NextResponse.json({ error: "status must be pending, verified, suspended or rejected" }, { status: 400 });
  }

  const ok = await setBusinessKybStatus(params.id, body.status, admin.email);
  if (!ok) return NextResponse.json({ error: "business not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
