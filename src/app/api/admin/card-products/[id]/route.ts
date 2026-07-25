import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// Update any field of a card product (fees, active, etc.), or delete one that
// has never issued a card.
const COL: Record<string, "int" | "pct" | "bool" | "text"> = {
  name: "text",
  description: "text",
  brand: "text",
  creation_fee_minor: "int",
  authorization_fee_minor: "int",
  funding_fee_pct: "pct",
  funding_fee_min_minor: "int",
  funding_fee_max_minor: "int",
  decline_fee_minor: "int",
  dispute_fee_minor: "int",
  intl_fee_pct: "pct",
  intl_fee_fixed_minor: "int",
  active: "bool",
  sort_order: "int",
};

// camelCase (client) -> snake_case (column)
const FIELD: Record<string, string> = {
  name: "name",
  description: "description",
  brand: "brand",
  creationFeeMinor: "creation_fee_minor",
  authorizationFeeMinor: "authorization_fee_minor",
  fundingFeePct: "funding_fee_pct",
  fundingFeeMinMinor: "funding_fee_min_minor",
  fundingFeeMaxMinor: "funding_fee_max_minor",
  declineFeeMinor: "decline_fee_minor",
  disputeFeeMinor: "dispute_fee_minor",
  intlFeePct: "intl_fee_pct",
  intlFeeFixedMinor: "intl_fee_fixed_minor",
  active: "active",
  sortOrder: "sort_order",
};

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await assertPermission(admin.role, "rates.edit");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const b = await req.json().catch(() => ({}));
  const sets: string[] = [];
  const vals: unknown[] = [params.id];
  for (const [key, col] of Object.entries(FIELD)) {
    if (!(key in (b ?? {}))) continue;
    const kind = COL[col];
    let v = b[key];
    if (kind === "int") v = v == null || v === "" ? null : Math.round(Number(v));
    else if (kind === "pct") v = v == null || v === "" ? 0 : Number(v);
    else if (kind === "bool") v = Boolean(v);
    else v = v == null ? null : String(v);
    vals.push(v);
    sets.push(`${col} = $${vals.length}`);
  }
  if (sets.length === 0) return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  sets.push("updated_at = now()");

  const { rowCount } = await query(`UPDATE card_products SET ${sets.join(", ")} WHERE id = $1`, vals);
  if (!rowCount) return NextResponse.json({ error: "not found" }, { status: 404 });
  await logAudit(admin.adminUserId, "card_product_updated", "card_product", params.id, b);
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

  const { rows } = await query<{ c: string }>(`SELECT count(*) c FROM cards WHERE product_id = $1`, [params.id]);
  if (Number(rows[0].c) > 0) {
    await query(`UPDATE card_products SET active = false, updated_at = now() WHERE id = $1`, [params.id]);
    return NextResponse.json({ ok: true, deactivated: true, message: "Product has issued cards, so it was deactivated rather than deleted." });
  }
  await query(`DELETE FROM card_products WHERE id = $1`, [params.id]);
  await logAudit(admin.adminUserId, "card_product_deleted", "card_product", params.id, {});
  return NextResponse.json({ ok: true });
}
