import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { requireVerifiedBusiness } from "@/lib/business/teamService";
import { listBusinessAuditLog } from "@/lib/business/auditLogService";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });

  const entries = await listBusinessAuditLog(gate.membership.businessAccountId);
  return NextResponse.json({ entries });
}
