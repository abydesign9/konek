import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const sets: string[] = [];
  const vals: unknown[] = [params.id];

  if ("priceMinor" in (body ?? {})) {
    const priceMinor = body.priceMinor;
    if (!Number.isInteger(priceMinor) || priceMinor <= 0) {
      return NextResponse.json({ error: "priceMinor must be a positive integer" }, { status: 400 });
    }
    vals.push(priceMinor);
    sets.push(`price_minor = $${vals.length}`);
  }
  if ("active" in (body ?? {})) {
    if (typeof body.active !== "boolean") {
      return NextResponse.json({ error: "active must be a boolean" }, { status: 400 });
    }
    vals.push(body.active);
    sets.push(`active = $${vals.length}`);
  }
  if (sets.length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  await query(`UPDATE catalog_items SET ${sets.join(", ")} WHERE id = $1`, vals);
  await logAudit(admin.adminUserId, "catalog_item_rate_updated", "catalog_item", params.id, body);
  return NextResponse.json({ ok: true });
}
