import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { IncorrectCurrentSecretError, rotateAdminSecret, WeakSecretError } from "@/lib/admin/adminSecret";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

// Rotating the shared admin secret affects every admin's ability to log in
// — restricted to the same permission that gates admin-user management.
export async function POST(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const currentSecret = body?.currentSecret;
  const newSecret = body?.newSecret;
  if (typeof currentSecret !== "string" || typeof newSecret !== "string") {
    return NextResponse.json({ error: "currentSecret and newSecret are required" }, { status: 400 });
  }

  try {
    await assertPermission(admin.role, "admin_users.manage");
    await rotateAdminSecret(currentSecret, newSecret, admin.adminUserId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof IncorrectCurrentSecretError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof WeakSecretError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
