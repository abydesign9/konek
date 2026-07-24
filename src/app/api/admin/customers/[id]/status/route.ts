import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { setCustomerStatus, CustomerNotFoundError, type CustomerStatus } from "@/lib/admin/customerAdmin";

const ALLOWED: CustomerStatus[] = ["active", "suspended", "closed"];

// Suspend/block, reactivate, or deactivate a customer account. No hard delete:
// financial history is preserved; a closed account simply loses access.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await assertPermission(admin.role, "customers.manage");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const b = await req.json().catch(() => null);
  const status = b?.status as CustomerStatus;
  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: "status must be active, suspended or closed" }, { status: 400 });
  }

  try {
    await setCustomerStatus(params.id, status, admin.adminUserId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CustomerNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
