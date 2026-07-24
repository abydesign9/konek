import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { resolveTicket, NotFoundError } from "@/lib/support/supportService";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

// Mark a ticket resolved directly (no reply required).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    await assertPermission(admin.role, "support.reply");
    await resolveTicket(params.id, admin.adminUserId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
