import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { inviteAdminUser, isValidRole, listAdminUsers } from "@/lib/admin/adminUsers";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admins = await listAdminUsers();
  return NextResponse.json({ admins });
}

export async function POST(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { email, role } = body ?? {};
  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "a valid email is required" }, { status: 400 });
  }

  try {
    await assertPermission(admin.role, "admin_users.manage");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const assignedRole = typeof role === "string" && (await isValidRole(role)) ? role : "support";
  const result = await inviteAdminUser(email, assignedRole, admin.adminUserId);
  return NextResponse.json(result);
}
