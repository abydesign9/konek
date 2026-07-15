import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { changeAdminUserRole, InvalidRoleError } from "@/lib/admin/adminUsers";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const role = body?.role;
  if (typeof role !== "string") {
    return NextResponse.json({ error: "role is required" }, { status: 400 });
  }

  try {
    await assertPermission(admin.role, "admin_users.manage");
    await changeAdminUserRole(params.id, role, admin.adminUserId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof InvalidRoleError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
