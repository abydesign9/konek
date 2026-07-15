import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { deleteTemplate, getTemplate, NotFoundError, updateTemplate } from "@/lib/notifications/templates";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getTemplate(params.id));
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const updates: { name?: string; subject?: string; body?: string } = {};
  if (typeof body.name === "string") updates.name = body.name;
  if (typeof body.subject === "string") updates.subject = body.subject;
  if (typeof body.body === "string") updates.body = body.body;

  try {
    await assertPermission(admin.role, "marketing.manage");
    await updateTemplate(params.id, updates, admin.adminUserId);
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
    await assertPermission(admin.role, "marketing.manage");
    await deleteTemplate(params.id, admin.adminUserId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
