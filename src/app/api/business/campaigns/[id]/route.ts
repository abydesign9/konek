import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { requireVerifiedBusiness, canDistribute } from "@/lib/business/teamService";
import { setCampaignStatus } from "@/lib/business/campaignService";

const STATUSES = ["active", "completed", "archived"] as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });
  if (!canDistribute(gate.membership.role)) {
    return NextResponse.json({ error: "Your role cannot manage campaigns" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!STATUSES.includes(body?.status)) {
    return NextResponse.json({ error: `status must be one of ${STATUSES.join(", ")}` }, { status: 400 });
  }

  const ok = await setCampaignStatus(params.id, gate.membership.businessAccountId, userId, body.status);
  if (!ok) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
