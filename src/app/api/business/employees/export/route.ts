import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { requireVerifiedBusiness } from "@/lib/business/teamService";
import { listEmployees } from "@/lib/business/employeeService";

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok && gate.code !== "no_business") return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });
  if (!gate.ok) return NextResponse.json({ error: "no business account" }, { status: 404 });
  const membership = gate.membership;

  const employees = await listEmployees(membership.businessAccountId);
  const header = ["Name", "Department", "Network", "Phone", "Status"].join(",");
  const lines = employees.map((e) =>
    [e.full_name, e.department ?? "", e.network, e.phone, e.status].map(csvCell).join(",")
  );
  const csv = [header, ...lines].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="konek-employees.csv"`,
    },
  });
}
