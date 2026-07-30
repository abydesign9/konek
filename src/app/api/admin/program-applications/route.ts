import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { listApplications } from "@/lib/programs/applicationService";

// Admin-only: list community-program applications, optionally filtered by
// ?program=ambassador|influencer|creator_club.
export async function GET(req: NextRequest) {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const program = req.nextUrl.searchParams.get("program") ?? undefined;
  return NextResponse.json({ applications: await listApplications(program) });
}
