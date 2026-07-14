import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { approveAgent } from "@/lib/agents/agentService";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await approveAgent(params.id, admin.email);
  return NextResponse.json({ ok: true });
}
