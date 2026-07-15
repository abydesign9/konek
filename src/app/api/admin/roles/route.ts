import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { getRolePermissionMatrix, listPermissions, listPermissionTypes, listRoles } from "@/lib/admin/permissions";

export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [roles, permissionTypes, permissions, matrix] = await Promise.all([
    listRoles(),
    listPermissionTypes(),
    listPermissions(),
    getRolePermissionMatrix(),
  ]);
  return NextResponse.json({ roles, permissionTypes, permissions, matrix });
}
