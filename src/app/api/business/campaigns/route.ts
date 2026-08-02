import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { requireVerifiedBusiness, canDistribute, ForbiddenRoleError } from "@/lib/business/teamService";
import { listCampaigns, createCampaign } from "@/lib/business/campaignService";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });

  const campaigns = await listCampaigns(gate.membership.businessAccountId);
  return NextResponse.json({ campaigns });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });

  if (!canDistribute(gate.membership.role)) {
    return NextResponse.json({ error: new ForbiddenRoleError("create campaigns", gate.membership.role).message }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
  }
  const budgetMinor = body?.budgetMinor != null ? Number(body.budgetMinor) : undefined;
  if (budgetMinor != null && (!Number.isInteger(budgetMinor) || budgetMinor <= 0)) {
    return NextResponse.json({ error: "Budget must be a positive amount" }, { status: 400 });
  }

  const { id } = await createCampaign(gate.membership.businessAccountId, userId, {
    name: body.name,
    description: body.description,
    budgetMinor,
    startDate: body.startDate,
    endDate: body.endDate,
  });
  return NextResponse.json({ id });
}
