import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { requireVerifiedBusiness, assertCanManageMoney, ForbiddenRoleError } from "@/lib/business/teamService";
import { setBusinessCardFrozen } from "@/lib/business/businessCardService";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });

  try {
    assertCanManageMoney(gate.membership.role);
  } catch (err) {
    if (err instanceof ForbiddenRoleError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.frozen !== "boolean") {
    return NextResponse.json({ error: "frozen (boolean) is required" }, { status: 400 });
  }

  try {
    await setBusinessCardFrozen(params.id, gate.membership.businessAccountId, userId, body.frozen);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
}
