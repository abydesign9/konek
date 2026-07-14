import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";

export async function GET() {
  if (!isAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { rows } = await query(
    `SELECT id, kind, priority, healthy, last_health_check FROM vendors ORDER BY kind, priority`
  );
  return NextResponse.json({ vendors: rows });
}
