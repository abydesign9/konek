import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { requireVerifiedBusiness, assertCanManageTeam, ForbiddenRoleError } from "@/lib/business/teamService";
import { revokeApiKey } from "@/lib/business/apiKeyService";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });

  try {
    assertCanManageTeam(gate.membership.role);
  } catch (err) {
    if (err instanceof ForbiddenRoleError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const ok = await revokeApiKey(params.id, gate.membership.businessAccountId, userId);
  if (!ok) return NextResponse.json({ error: "Key not found or already revoked" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
