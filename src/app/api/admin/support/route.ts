import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { listMessagesForAdmin } from "@/lib/support/supportService";

export async function GET(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  return NextResponse.json({ messages: await listMessagesForAdmin(status) });
}
