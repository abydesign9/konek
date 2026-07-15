import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import {
  assertCanManageTeam,
  ForbiddenRoleError,
  getMembership,
  removeMember,
} from "@/lib/business/teamService";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const membership = await getMembership(userId);
  if (!membership) return NextResponse.json({ error: "no business account" }, { status: 404 });

  try {
    assertCanManageTeam(membership.role);
  } catch (err) {
    if (err instanceof ForbiddenRoleError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  await removeMember(membership.businessAccountId, userId, params.id);
  return NextResponse.json({ ok: true });
}
