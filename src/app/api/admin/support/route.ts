import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { listMessagesForAdmin } from "@/lib/support/supportService";

export async function GET(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const messages = await listMessagesForAdmin({
    status: req.nextUrl.searchParams.get("status") ?? undefined,
    category: req.nextUrl.searchParams.get("category") ?? undefined,
    priority: req.nextUrl.searchParams.get("priority") ?? undefined,
  });
  return NextResponse.json({ messages });
}
