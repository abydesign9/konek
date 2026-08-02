import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { requireVerifiedBusiness, assertCanManageTeam, ForbiddenRoleError } from "@/lib/business/teamService";
import { listApiKeys, createApiKey } from "@/lib/business/apiKeyService";

// Managing API keys is an admin-level action (same bar as inviting team
// members) — a leaked key is equivalent to a standing credential.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });

  const keys = await listApiKeys(gate.membership.businessAccountId);
  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
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

  const body = await req.json().catch(() => null);
  if (typeof body?.label !== "string" || !body.label.trim()) {
    return NextResponse.json({ error: "Label is required" }, { status: 400 });
  }
  const mode = body?.mode === "live" ? "live" : "sandbox";

  const { id, key } = await createApiKey(gate.membership.businessAccountId, userId, body.label, mode);
  return NextResponse.json({ id, key });
}
