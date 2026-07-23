import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

async function guard(role: string) {
  await assertPermission(role, "rates.edit");
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await guard(admin.role);
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const b = await req.json().catch(() => null);
  const sets: string[] = [];
  const vals: unknown[] = [params.id];
  const push = (col: string, v: unknown) => {
    vals.push(v);
    sets.push(`${col} = $${vals.length}`);
  };

  if ("name" in (b ?? {})) push("name", String(b.name).trim());
  if ("markupPct" in (b ?? {})) {
    const m = Number(b.markupPct);
    if (!Number.isFinite(m) || m < 0 || m > 1000) return NextResponse.json({ error: "invalid markupPct" }, { status: 400 });
    push("markup_pct", m);
  }
  if ("minCostMinor" in (b ?? {})) push("min_cost_minor", Math.round(Number(b.minCostMinor)));
  if ("maxCostMinor" in (b ?? {})) push("max_cost_minor", b.maxCostMinor == null || b.maxCostMinor === "" ? null : Math.round(Number(b.maxCostMinor)));
  if ("category" in (b ?? {})) push("category", b.category || null);
  if ("country" in (b ?? {})) push("country", b.country || null);
  if ("priority" in (b ?? {})) push("priority", Number(b.priority));
  if ("active" in (b ?? {})) push("active", Boolean(b.active));

  if (sets.length === 0) return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  sets.push("updated_at = now()");

  const { rowCount } = await query(`UPDATE pricing_rules SET ${sets.join(", ")} WHERE id = $1`, vals);
  if (!rowCount) return NextResponse.json({ error: "not found" }, { status: 404 });
  await logAudit(admin.adminUserId, "pricing_rule_updated", "pricing_rule", params.id, b);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await guard(admin.role);
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
  await query(`DELETE FROM pricing_rules WHERE id = $1`, [params.id]);
  await logAudit(admin.adminUserId, "pricing_rule_deleted", "pricing_rule", params.id, {});
  return NextResponse.json({ ok: true });
}
