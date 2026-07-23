import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";

// Import history for the marketplace dashboard.
export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { rows } = await query(
    `SELECT ir.id, ir.supplier_id, v.name AS supplier_name, ir.source, ir.status,
            ir.products_imported, ir.products_updated, ir.products_failed, ir.duration_ms,
            ir.error, ir.started_at, ir.finished_at
       FROM import_runs ir LEFT JOIN vendors v ON v.id = ir.supplier_id
      ORDER BY ir.started_at DESC LIMIT 50`
  );
  return NextResponse.json({ imports: rows });
}
