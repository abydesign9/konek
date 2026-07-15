import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assignTicket, NotFoundError } from "@/lib/support/supportService";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  // Defaults to assigning to yourself — the common case — but a lead can
  // hand a ticket to a specific admin by id.
  const adminUserId = typeof body?.adminUserId === "string" ? body.adminUserId : admin.adminUserId;

  try {
    await assertPermission(admin.role, "support.reply");
    await assignTicket(params.id, adminUserId, admin.adminUserId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
