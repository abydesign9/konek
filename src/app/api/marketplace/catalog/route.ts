import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";

// Customer marketplace: ONE listing per product. No supplier is ever exposed —
// the customer sees a country, size, validity and a price, nothing else.
export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const country = req.nextUrl.searchParams.get("country");
  const type = req.nextUrl.searchParams.get("type"); // country | region | global

  const params: unknown[] = [];
  const where = ["active = true", "display_price_minor IS NOT NULL", "category = 'esim'"];
  if (country) {
    params.push(country.toUpperCase());
    where.push(`country = $${params.length}`);
  }
  if (type === "country") where.push("country IS NOT NULL");
  if (type === "region") where.push("country IS NULL AND region IS NOT NULL AND region <> 'MULTI'");
  if (type === "global") where.push("country IS NULL");

  const { rows } = await query(
    `SELECT id, display_name, country, region, operator, data_amount, validity, network_type,
            currency, display_price_minor, promo_price_minor
       FROM catalog_products
      WHERE ${where.join(" AND ")}
      ORDER BY country NULLS LAST, data_amount, validity
      LIMIT 500`,
    params
  );

  return NextResponse.json({
    products: rows.map((r) => ({
      id: r.id,
      name: r.display_name,
      country: r.country,
      region: r.region,
      operator: r.operator,
      dataAmount: Number(r.data_amount),
      validity: r.validity,
      networkType: r.network_type,
      currency: r.currency,
      priceMinor: Number(r.display_price_minor),
      onPromo: r.promo_price_minor != null,
    })),
  });
}
