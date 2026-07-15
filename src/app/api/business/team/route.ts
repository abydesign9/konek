import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import {
  AlreadyMemberError,
  assertCanManageTeam,
  ForbiddenRoleError,
  getMembership,
  inviteMember,
  listTeam,
  TEAM_ROLES,
  UserNotFoundError,
  type TeamRole,
} from "@/lib/business/teamService";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const membership = await getMembership(userId);
  if (!membership) return NextResponse.json({ team: [], role: null });

  const team = await listTeam(membership.businessAccountId);
  return NextResponse.json({ team, role: membership.role });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const membership = await getMembership(userId);
  if (!membership) return NextResponse.json({ error: "no business account" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const phone = body?.phone;
  const role = body?.role;
  if (typeof phone !== "string" || !/^\+\d{7,15}$/.test(phone)) {
    return NextResponse.json({ error: "phone must be E.164, e.g. +2348012345678" }, { status: 400 });
  }
  if (!TEAM_ROLES.includes(role)) {
    return NextResponse.json({ error: `role must be one of ${TEAM_ROLES.join(", ")}` }, { status: 400 });
  }

  try {
    assertCanManageTeam(membership.role);
    const result = await inviteMember(membership.businessAccountId, userId, phone, role as TeamRole);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ForbiddenRoleError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof UserNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    if (err instanceof AlreadyMemberError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
}
