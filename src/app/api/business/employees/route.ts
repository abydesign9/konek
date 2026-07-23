import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { requireVerifiedBusiness } from "@/lib/business/teamService";
import { addEmployee, addEmployeesBulk, listEmployees } from "@/lib/business/employeeService";

const VALID_NETWORKS = ["mtn", "glo", "airtel", "9mobile"];

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok && gate.code !== "no_business") return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });
  if (!gate.ok) return NextResponse.json({ employees: [] });
  const membership = gate.membership;

  return NextResponse.json({ employees: await listEmployees(membership.businessAccountId) });
}

function validateRow(r: unknown): r is { fullName: string; department?: string; phone: string; network: string } {
  const row = r as Record<string, unknown>;
  return (
    typeof row?.fullName === "string" &&
    row.fullName.trim().length > 0 &&
    typeof row?.phone === "string" &&
    row.phone.length >= 10 &&
    typeof row?.network === "string" &&
    VALID_NETWORKS.includes(row.network)
  );
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok && gate.code !== "no_business") return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });
  if (!gate.ok) return NextResponse.json({ error: "no business account — apply first" }, { status: 404 });
  const membership = gate.membership;

  const body = await req.json().catch(() => null);

  // Bulk: { rows: [...] }. Single: { fullName, department, phone, network }.
  if (Array.isArray(body?.rows)) {
    const rows = body.rows;
    if (rows.length === 0) return NextResponse.json({ error: "rows must be a non-empty array" }, { status: 400 });
    const invalid = rows.filter((r: unknown) => !validateRow(r));
    if (invalid.length > 0) {
      return NextResponse.json({ error: `${invalid.length} row(s) are missing a valid name, phone or network` }, { status: 400 });
    }
    const result = await addEmployeesBulk(membership.businessAccountId, rows, userId);
    return NextResponse.json(result);
  }

  if (!validateRow(body)) {
    return NextResponse.json({ error: "fullName, phone and a valid network are required" }, { status: 400 });
  }
  const result = await addEmployee(membership.businessAccountId, body, userId);
  return NextResponse.json(result);
}
