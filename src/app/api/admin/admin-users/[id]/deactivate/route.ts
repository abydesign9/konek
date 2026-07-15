import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { deactivateAdminUser } from "@/lib/admin/adminUsers";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    await assertPermission(admin.role, "admin_users.manage");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  await deactivateAdminUser(params.id, admin.adminUserId);
  return NextResponse.json({ ok: true });
}
