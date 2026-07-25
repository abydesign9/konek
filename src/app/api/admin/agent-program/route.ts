import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { query } from "@/lib/db";
import { getAgentProgram, setAgentProgram, type AgentProgram } from "@/lib/agents/agentProgram";

// Read the agent-programme settings + a few live stats; update the settings.
export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const num = async (sql: string) => Number((await query<{ v: string }>(sql)).rows[0]?.v ?? 0);
  const [agents, unpaidMinor, paidMinor] = await Promise.all([
    num(`SELECT count(*) v FROM agents WHERE status='active'`),
    num(`SELECT COALESCE(sum(amount_minor),0) v FROM agent_commissions WHERE paid=false`),
    num(`SELECT COALESCE(sum(amount_minor),0) v FROM agent_commissions WHERE paid=true`),
  ]);
  return NextResponse.json({ program: await getAgentProgram(), stats: { activeAgents: agents, unpaidMinor, paidMinor } });
}

const NUM: (keyof AgentProgram)[] = ["affiliateCommissionPct", "feeDiscountPct", "limitMultiplier"];
const BOOL: (keyof AgentProgram)[] = ["enabled", "waiveCardCreationFee", "prioritySupport"];

export async function PUT(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await assertPermission(admin.role, "agents.manage");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const b = await req.json().catch(() => null);
  const patch: Partial<AgentProgram> = {};
  for (const k of NUM) if (k in (b ?? {}) && Number.isFinite(Number(b[k]))) (patch[k] as number) = Number(b[k]);
  for (const k of BOOL) if (typeof b?.[k] === "boolean") (patch[k] as boolean) = b[k];

  const program = await setAgentProgram(patch, admin.adminUserId);
  return NextResponse.json({ ok: true, program });
}
