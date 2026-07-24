import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { repriceProduct } from "@/lib/marketplace/repository";

// Override a product: fixed price, markup, promo, recommended supplier, expiry,
// or active flag. After any override change we reprice so display_price reflects
// it immediately.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await assertPermission(admin.role, "rates.edit");
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

  if ("priceOverrideMinor" in (b ?? {})) push("price_override_minor", b.priceOverrideMinor == null ? null : Math.round(Number(b.priceOverrideMinor)));
  if ("markupOverridePct" in (b ?? {})) push("markup_override_pct", b.markupOverridePct == null ? null : Number(b.markupOverridePct));
  if ("promoPriceMinor" in (b ?? {})) push("promo_price_minor", b.promoPriceMinor == null ? null : Math.round(Number(b.promoPriceMinor)));
  if ("overrideExpiresAt" in (b ?? {})) push("override_expires_at", b.overrideExpiresAt || null);
  if ("recommendedSupplierId" in (b ?? {})) push("recommended_supplier_id", b.recommendedSupplierId || null);
  if ("active" in (b ?? {})) push("active", Boolean(b.active));
  if ("displayName" in (b ?? {})) push("display_name", String(b.displayName).trim());

  if (sets.length === 0) return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  sets.push("updated_at = now()");

  const { rowCount } = await query(`UPDATE catalog_products SET ${sets.join(", ")} WHERE id = $1`, vals);
  if (!rowCount) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Recompute from cost + the new overrides (unless we just deactivated it).
  if (b?.active !== false) await repriceProduct(params.id);

  await logAudit(admin.adminUserId, "marketplace_product_override", "catalog_product", params.id, b);
  return NextResponse.json({ ok: true });
}

// Permanently remove a product and its supplier links. Use for junk/mistaken
// imports; to merely hide a live product prefer PATCH { active: false }.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await assertPermission(admin.role, "rates.edit");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  await query(`DELETE FROM supplier_products WHERE catalog_product_id = $1`, [params.id]);
  const { rowCount } = await query(`DELETE FROM catalog_products WHERE id = $1`, [params.id]);
  if (!rowCount) return NextResponse.json({ error: "not found" }, { status: 404 });

  await logAudit(admin.adminUserId, "marketplace_product_deleted", "catalog_product", params.id, {});
  return NextResponse.json({ ok: true });
}
