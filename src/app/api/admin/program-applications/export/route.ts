import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { listApplications, applicationsToCsv } from "@/lib/programs/applicationService";
import { isProgramKey } from "@/lib/programs/programForms";

// Admin-only: download all applications for one program as CSV.
export async function GET(req: NextRequest) {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const program = req.nextUrl.searchParams.get("program");
  if (!isProgramKey(program)) {
    return NextResponse.json({ error: "program must be ambassador, influencer or creator_club" }, { status: 400 });
  }

  const rows = await listApplications(program);
  const csv = applicationsToCsv(program, rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="raviion-${program}-applications.csv"`,
    },
  });
}
