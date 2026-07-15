import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { getSupportStats } from "@/lib/support/supportService";

export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getSupportStats());
}
