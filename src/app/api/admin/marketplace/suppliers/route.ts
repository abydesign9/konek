import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";

// Suppliers (vendors) with their marketplace stats + last import, for the admin
// dashboard. Best/cheapest/most-reliable are derived here so the UI stays dumb.
export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { rows } = await query(
    `SELECT v.id, v.name, v.slug, v.api_type, v.enabled, v.healthy, v.maintenance, v.priority,
            v.success_rate, v.average_response_ms, v.currency, v.supports_realtime_inventory,
            (SELECT COUNT(*) FROM supplier_products sp WHERE sp.supplier_id = v.id AND sp.active) AS product_count,
            (SELECT started_at FROM import_runs ir WHERE ir.supplier_id = v.id ORDER BY started_at DESC LIMIT 1) AS last_import
       FROM vendors v
      WHERE v.kind = 'vtu'
      ORDER BY v.priority ASC, v.id`
  );

  return NextResponse.json({ suppliers: rows });
}
