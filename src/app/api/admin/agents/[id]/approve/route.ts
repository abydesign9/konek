import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin/session";
import { approveAgent } from "@/lib/agents/agentService";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!isAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await approveAgent(params.id, "admin");
  return NextResponse.json({ ok: true });
}
