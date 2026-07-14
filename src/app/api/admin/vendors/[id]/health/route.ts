import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const healthy = body?.healthy;
  if (typeof healthy !== "boolean") {
    return NextResponse.json({ error: "healthy (boolean) is required" }, { status: 400 });
  }

  await query(`UPDATE vendors SET healthy = $2, last_health_check = now() WHERE id = $1`, [
    params.id,
    healthy,
  ]);
  await logAudit("admin", "vendor_health_toggled", "vendor", params.id, { healthy });

  return NextResponse.json({ ok: true });
}
