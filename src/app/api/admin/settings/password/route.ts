import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { adminHasPassword, verifyAdminPassword, setAdminPassword, WeakPasswordError } from "@/lib/admin/adminPassword";
import { verifyAdminSecret } from "@/lib/admin/adminSecret";

// Set or change the signed-in admin's OWN password. Verifies the current
// credential first: their existing password if they have one, otherwise the
// shared secret (the bootstrap path used to set a password the first time).
export async function POST(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const current = body?.current;
  const newPassword = body?.newPassword;
  if (typeof current !== "string" || typeof newPassword !== "string") {
    return NextResponse.json({ error: "current and newPassword are required" }, { status: 400 });
  }

  // Verify the current credential.
  const hasPw = await adminHasPassword(admin.email);
  const ok = hasPw ? Boolean(await verifyAdminPassword(admin.email, current)) : await verifyAdminSecret(current);
  if (!ok) {
    return NextResponse.json({ error: hasPw ? "Current password is incorrect" : "Current admin secret is incorrect" }, { status: 401 });
  }

  try {
    await setAdminPassword(admin.adminUserId, newPassword, admin.adminUserId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof WeakPasswordError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
