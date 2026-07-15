import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError, setRolePermissions } from "@/lib/admin/permissions";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { name: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const permissionKeys = body?.permissionKeys;
  if (!Array.isArray(permissionKeys) || !permissionKeys.every((k) => typeof k === "string")) {
    return NextResponse.json({ error: "permissionKeys must be an array of strings" }, { status: 400 });
  }

  try {
    await assertPermission(admin.role, "roles.manage");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  await setRolePermissions(params.name, permissionKeys);
  await logAudit(admin.adminUserId, "role_permissions_updated", "admin_role", params.name, { permissionKeys });
  return NextResponse.json({ ok: true });
}
