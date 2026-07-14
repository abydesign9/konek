import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";

export async function GET() {
  if (!isAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { rows } = await query(
    `SELECT vendor, period_start, ledger_total_minor, vendor_total_minor, drift_minor, status, run_at
     FROM reconciliation_runs ORDER BY run_at DESC LIMIT 30`
  );
  return NextResponse.json({ runs: rows });
}
