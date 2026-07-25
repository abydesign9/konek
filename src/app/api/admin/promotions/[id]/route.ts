import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// Pause / resume / edit a promo, or delete one that has no claims.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await assertPermission(admin.role, "promotions.manage");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const b = await req.json().catch(() => null);
  const sets: string[] = [];
  const vals: unknown[] = [params.id];
  const set = (col: string, v: unknown) => {
    vals.push(v);
    sets.push(`${col} = $${vals.length}`);
  };
  if (typeof b?.status === "string" && ["active", "paused"].includes(b.status)) set("status", b.status);
  if ("budgetCapMinor" in (b ?? {})) set("budget_cap_minor", b.budgetCapMinor == null || b.budgetCapMinor === "" ? null : Math.round(Number(b.budgetCapMinor)));
  if ("endDate" in (b ?? {})) set("end_date", b.endDate || null);
  if (typeof b?.notificationMessage === "string") set("notification_message", b.notificationMessage);
  if (sets.length === 0) return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  sets.push("updated_at = now()");

  const { rowCount } = await query(`UPDATE promotions SET ${sets.join(", ")} WHERE id = $1`, vals);
  if (!rowCount) return NextResponse.json({ error: "not found" }, { status: 404 });
  await logAudit(admin.adminUserId, "promo_updated", "promotion", params.id, b);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await assertPermission(admin.role, "promotions.manage");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  // A promo with claims is financial history: pause it instead of deleting.
  const { rows } = await query<{ c: string }>(`SELECT count(*) c FROM promo_claims WHERE promo_id = $1`, [params.id]);
  if (Number(rows[0].c) > 0) {
    await query(`UPDATE promotions SET status = 'paused', updated_at = now() WHERE id = $1`, [params.id]);
    return NextResponse.json({ ok: true, paused: true, message: "Promo has claims, so it was paused rather than deleted." });
  }
  await query(`DELETE FROM promotions WHERE id = $1`, [params.id]);
  await logAudit(admin.adminUserId, "promo_deleted", "promotion", params.id, {});
  return NextResponse.json({ ok: true });
}
