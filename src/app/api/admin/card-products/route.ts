import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { listCardProducts } from "@/lib/cards/cardProducts";

// Admin: list all card products (active + inactive) and create a new one.
export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ products: await listCardProducts(false) });
}

const NUM = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : d);
const PCT = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

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
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const currency = (b?.currency ?? "USD").toUpperCase().slice(0, 3);
  const formFactor = b?.formFactor === "physical" ? "physical" : "virtual";

  const { rows } = await query<{ id: string }>(
    `INSERT INTO card_products
       (name, currency, form_factor, brand, description, creation_fee_minor, authorization_fee_minor,
        funding_fee_pct, funding_fee_min_minor, funding_fee_max_minor, decline_fee_minor, dispute_fee_minor,
        intl_fee_pct, intl_fee_fixed_minor, active, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
    [
      name,
      currency,
      formFactor,
      b?.brand === "mastercard" ? "mastercard" : "visa",
      b?.description ?? null,
      NUM(b?.creationFeeMinor),
      NUM(b?.authorizationFeeMinor),
      PCT(b?.fundingFeePct),
      NUM(b?.fundingFeeMinMinor),
      b?.fundingFeeMaxMinor == null || b.fundingFeeMaxMinor === "" ? null : NUM(b.fundingFeeMaxMinor),
      NUM(b?.declineFeeMinor),
      NUM(b?.disputeFeeMinor),
      PCT(b?.intlFeePct),
      NUM(b?.intlFeeFixedMinor),
      b?.active !== false,
      NUM(b?.sortOrder, 100),
    ]
  );
  await logAudit(admin.adminUserId, "card_product_created", "card_product", rows[0].id, { name });
  return NextResponse.json({ id: rows[0].id });
}
