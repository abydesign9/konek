import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { getCampaignAnalytics } from "@/lib/notifications/campaigns";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getCampaignAnalytics(params.id));
}
