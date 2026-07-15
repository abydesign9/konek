import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";

export async function GET() {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { rows } = await query(
    `SELECT id, vendor, service_type, external_id, name, network, cost_minor, price_minor, currency, active, synced_at
     FROM catalog_items ORDER BY service_type, network, price_minor`
  );
  return NextResponse.json({ items: rows });
}
