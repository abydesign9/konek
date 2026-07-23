import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

// Bulk re-price: price = cost * (1 + markupPct/100), rounded up so we never
// sell below cost. Scope it to a service type / vendor / explicit ids, or run it
// across the whole catalogue. `dryRun` returns the preview without writing —
// the console always previews before applying.
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
  const markupPct = Number(b?.markupPct);
  const serviceType = typeof b?.serviceType === "string" && b.serviceType ? b.serviceType : null;
  const vendor = typeof b?.vendor === "string" && b.vendor ? b.vendor : null;
  const ids: string[] | null = Array.isArray(b?.ids) && b.ids.length ? b.ids : null;
  const dryRun = b?.dryRun === true;

  if (!Number.isFinite(markupPct) || markupPct < 0 || markupPct > 500) {
    return NextResponse.json({ error: "markupPct must be between 0 and 500" }, { status: 400 });
  }

  const where: string[] = ["cost_minor > 0"];
  const params: unknown[] = [];
  if (serviceType) {
    params.push(serviceType);
    where.push(`service_type = $${params.length}`);
  }
  if (vendor) {
    params.push(vendor);
    where.push(`vendor = $${params.length}`);
  }
  if (ids) {
    params.push(ids);
    where.push(`id = ANY($${params.length}::uuid[])`);
  }
  const whereSql = where.join(" AND ");

  const factor = 1 + markupPct / 100;

  if (dryRun) {
    const { rows } = await query<{ id: string; name: string; cost_minor: string; price_minor: string; currency: string }>(
      `SELECT id, name, cost_minor, price_minor, currency FROM catalog_items WHERE ${whereSql} ORDER BY service_type, name LIMIT 500`,
      params
    );
    return NextResponse.json({
      dryRun: true,
      count: rows.length,
      preview: rows.map((r) => ({
        id: r.id,
        name: r.name,
        currency: r.currency,
        costMinor: Number(r.cost_minor),
        currentPriceMinor: Number(r.price_minor),
        newPriceMinor: Math.ceil(Number(r.cost_minor) * factor),
      })),
    });
  }

  params.push(factor);
  const { rowCount } = await query(
    `UPDATE catalog_items SET price_minor = CEIL(cost_minor * $${params.length}) WHERE ${whereSql}`,
    params
  );

  await logAudit(admin.adminUserId, "catalog_bulk_markup", "catalog_item", serviceType ?? vendor ?? "all", {
    markupPct,
    serviceType,
    vendor,
    ids: ids?.length ?? null,
    updated: rowCount,
  });

  return NextResponse.json({ updated: rowCount ?? 0 });
}
