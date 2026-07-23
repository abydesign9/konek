import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { rows } = await query(
    `SELECT id, name, min_cost_minor, max_cost_minor, markup_pct, category, country, supplier_id, priority, active
       FROM pricing_rules ORDER BY priority DESC, min_cost_minor ASC`
  );
  return NextResponse.json({ rules: rows });
}

export async function POST(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await assertPermission(admin.role, "rates.edit");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? "").trim();
  const minCostMinor = Number(b?.minCostMinor ?? 0);
  const maxCostMinor = b?.maxCostMinor == null || b.maxCostMinor === "" ? null : Number(b.maxCostMinor);
  const markupPct = Number(b?.markupPct);

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!Number.isFinite(minCostMinor) || minCostMinor < 0) return NextResponse.json({ error: "invalid minCostMinor" }, { status: 400 });
  if (maxCostMinor != null && (!Number.isFinite(maxCostMinor) || maxCostMinor <= minCostMinor)) {
    return NextResponse.json({ error: "maxCostMinor must be greater than minCostMinor" }, { status: 400 });
  }
  if (!Number.isFinite(markupPct) || markupPct < 0 || markupPct > 1000) {
    return NextResponse.json({ error: "markupPct must be between 0 and 1000" }, { status: 400 });
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO pricing_rules (name, min_cost_minor, max_cost_minor, markup_pct, category, country, supplier_id, priority, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true) RETURNING id`,
    [
      name,
      Math.round(minCostMinor),
      maxCostMinor == null ? null : Math.round(maxCostMinor),
      markupPct,
      b?.category || null,
      b?.country || null,
      b?.supplierId || null,
      Number.isFinite(Number(b?.priority)) ? Number(b.priority) : 100,
    ]
  );
  await logAudit(admin.adminUserId, "pricing_rule_created", "pricing_rule", rows[0].id, { name, markupPct });
  return NextResponse.json({ id: rows[0].id });
}
