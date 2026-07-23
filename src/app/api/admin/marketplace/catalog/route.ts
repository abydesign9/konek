import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";

// Admin catalogue view: each customer-facing product with the display price and
// EVERY supplier's cost + stock (what the customer never sees). Also the summary
// tiles for the marketplace dashboard.
export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { rows: products } = await query(
    `SELECT p.id, p.display_name, p.country, p.region, p.operator, p.data_amount, p.validity,
            p.network_type, p.category, p.currency, p.display_price_minor, p.lowest_supplier_cost_minor,
            p.price_override_minor, p.markup_override_pct, p.promo_price_minor, p.recommended_supplier_id,
            p.active,
            COALESCE(json_agg(
              json_build_object(
                'supplierId', sp.supplier_id, 'supplierName', v.name, 'sku', sp.supplier_sku,
                'costMinor', sp.supplier_cost_minor, 'stockStatus', sp.stock_status,
                'apiStatus', sp.api_status, 'active', sp.active
              ) ORDER BY sp.supplier_cost_minor
            ) FILTER (WHERE sp.id IS NOT NULL), '[]') AS suppliers
       FROM catalog_products p
       LEFT JOIN supplier_products sp ON sp.catalog_product_id = p.id
       LEFT JOIN vendors v ON v.id = sp.supplier_id
      GROUP BY p.id
      ORDER BY p.country NULLS LAST, p.data_amount, p.validity
      LIMIT 1000`
  );

  const { rows: stats } = await query<{
    products: string;
    supplier_products: string;
    avg_margin: string | null;
    avg_markup: string | null;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM catalog_products) AS products,
       (SELECT COUNT(*) FROM supplier_products WHERE active) AS supplier_products,
       (SELECT AVG((display_price_minor - lowest_supplier_cost_minor)::numeric / NULLIF(display_price_minor,0))
          FROM catalog_products WHERE display_price_minor > 0) AS avg_margin,
       (SELECT AVG((display_price_minor - lowest_supplier_cost_minor)::numeric / NULLIF(lowest_supplier_cost_minor,0))
          FROM catalog_products WHERE lowest_supplier_cost_minor > 0) AS avg_markup`
  );

  return NextResponse.json({
    products,
    stats: {
      catalogProducts: Number(stats[0]?.products ?? 0),
      supplierProducts: Number(stats[0]?.supplier_products ?? 0),
      avgMarginPct: stats[0]?.avg_margin ? Number(stats[0].avg_margin) * 100 : 0,
      avgMarkupPct: stats[0]?.avg_markup ? Number(stats[0].avg_markup) * 100 : 0,
    },
  });
}
