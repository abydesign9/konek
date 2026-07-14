import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { inviteAdminUser, listAdminUsers } from "@/lib/admin/adminUsers";

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
  const validRoles = ["support", "kyc_reviewer", "risk", "finance", "super_admin"];
  const assignedRole = validRoles.includes(role) ? role : "support";

  const result = await inviteAdminUser(email, assignedRole, admin.adminUserId);
  return NextResponse.json(result);
}
