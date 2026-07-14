import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin/session";
import { payAgentCommissions } from "@/lib/agents/agentService";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!isAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await payAgentCommissions(params.id, "admin");
  return NextResponse.json(result);
}
