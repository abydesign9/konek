import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { addInternalNote, NotFoundError } from "@/lib/support/supportService";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const message = body?.body;
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  try {
    await assertPermission(admin.role, "support.reply");
    const result = await addInternalNote(params.id, admin.adminUserId, message.trim());
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
