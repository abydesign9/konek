import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import {
  assertCanManageTeam,
  ForbiddenRoleError,
  requireVerifiedBusiness,
  removeMember,
  changeMemberRole,
  TEAM_ROLES,
  type TeamRole,
} from "@/lib/business/teamService";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok && gate.code !== "no_business") return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });
  if (!gate.ok) return NextResponse.json({ error: "no business account" }, { status: 404 });
  const membership = gate.membership;

  try {
    assertCanManageTeam(membership.role);
  } catch (err) {
    if (err instanceof ForbiddenRoleError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  await removeMember(membership.businessAccountId, userId, params.id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok && gate.code !== "no_business") return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });
  if (!gate.ok) return NextResponse.json({ error: "no business account" }, { status: 404 });
  const membership = gate.membership;

  try {
    assertCanManageTeam(membership.role);
  } catch (err) {
    if (err instanceof ForbiddenRoleError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const body = await req.json().catch(() => null);
  if (!TEAM_ROLES.includes(body?.role)) {
    return NextResponse.json({ error: `role must be one of ${TEAM_ROLES.join(", ")}` }, { status: 400 });
  }

  const ok = await changeMemberRole(membership.businessAccountId, userId, params.id, body.role as TeamRole);
  if (!ok) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
