import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import {
  assertCanManageTeam,
  ForbiddenRoleError,
  requireVerifiedBusiness,
  removeMember,
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
