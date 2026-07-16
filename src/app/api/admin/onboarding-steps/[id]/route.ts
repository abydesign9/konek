import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { deleteTourStep, NotFoundError, updateTourStep } from "@/lib/onboarding/tourSteps";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (body.stepOrder !== undefined) updates.stepOrder = Number(body.stepOrder);
  for (const key of ["icon", "title", "body", "status"]) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  try {
    await assertPermission(admin.role, "marketing.manage");
    await updateTourStep(params.id, updates, admin.adminUserId);
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
    await deleteTourStep(params.id, admin.adminUserId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
