import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { deleteFaq, NotFoundError, updateFaq } from "@/lib/support/faqService";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const updates: { category?: string; question?: string; answer?: string; published?: boolean } = {};
  if (typeof body.category === "string") updates.category = body.category;
  if (typeof body.question === "string") updates.question = body.question;
  if (typeof body.answer === "string") updates.answer = body.answer;
  if (typeof body.published === "boolean") updates.published = body.published;

  try {
    await assertPermission(admin.role, "support.reply");
    await updateFaq(params.id, updates, admin.adminUserId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    await assertPermission(admin.role, "support.reply");
    await deleteFaq(params.id, admin.adminUserId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
