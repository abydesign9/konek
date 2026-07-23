import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    await assertPermission(admin.role, "rates.edit");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

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
  if ("costMinor" in (body ?? {})) {
    const costMinor = body.costMinor;
    if (!Number.isInteger(costMinor) || costMinor < 0) {
      return NextResponse.json({ error: "costMinor must be a non-negative integer" }, { status: 400 });
    }
    vals.push(costMinor);
    sets.push(`cost_minor = $${vals.length}`);
  }
  if ("name" in (body ?? {})) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
    }
    vals.push(body.name.trim());
    sets.push(`name = $${vals.length}`);
  }
  if ("network" in (body ?? {})) {
    vals.push(typeof body.network === "string" && body.network.trim() ? body.network.trim() : null);
    sets.push(`network = $${vals.length}`);
  }
  if ("meta" in (body ?? {})) {
    vals.push(body.meta && typeof body.meta === "object" ? JSON.stringify(body.meta) : null);
    sets.push(`meta = $${vals.length}::jsonb`);
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
  await logAudit(admin.adminUserId, "catalog_item_updated", "catalog_item", params.id, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    await assertPermission(admin.role, "rates.edit");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  await query(`DELETE FROM catalog_items WHERE id = $1`, [params.id]);
  await logAudit(admin.adminUserId, "catalog_item_deleted", "catalog_item", params.id, {});
  return NextResponse.json({ ok: true });
}
