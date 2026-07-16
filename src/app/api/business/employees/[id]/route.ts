import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getMembership } from "@/lib/business/teamService";
import { deleteEmployee, NotFoundError, setEmployeeStatus } from "@/lib/business/employeeService";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const membership = await getMembership(userId);
  if (!membership) return NextResponse.json({ error: "no business account" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const status = body?.status;
  if (status !== "active" && status !== "inactive") {
    return NextResponse.json({ error: "status must be active or inactive" }, { status: 400 });
  }

  try {
    await setEmployeeStatus(params.id, membership.businessAccountId, status, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const membership = await getMembership(userId);
  if (!membership) return NextResponse.json({ error: "no business account" }, { status: 404 });

  try {
    await deleteEmployee(params.id, membership.businessAccountId, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
