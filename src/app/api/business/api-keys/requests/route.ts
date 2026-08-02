import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { requireVerifiedBusiness } from "@/lib/business/teamService";
import { listApiRequests } from "@/lib/business/apiKeyService";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });

  const requests = await listApiRequests(gate.membership.businessAccountId);
  return NextResponse.json({ requests });
}
