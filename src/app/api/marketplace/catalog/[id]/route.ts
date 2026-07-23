import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";

// One product's public detail. Still no supplier data — just what the customer
// buys. Availability is derived from having at least one live supplier.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { rows } = await query<{
    id: string;
    display_name: string;
    country: string | null;
    region: string | null;
    operator: string | null;
    data_amount: string;
    validity: number;
    network_type: string | null;
    currency: string;
    display_price_minor: string | null;
    active: boolean;
    supplier_count: string;
  }>(
    `SELECT p.id, p.display_name, p.country, p.region, p.operator, p.data_amount, p.validity,
            p.network_type, p.currency, p.display_price_minor, p.active,
            (SELECT COUNT(*) FROM supplier_products sp
              WHERE sp.catalog_product_id = p.id AND sp.active AND sp.stock_status <> 'out_of_stock') AS supplier_count
       FROM catalog_products p WHERE p.id = $1`,
    [params.id]
  );
  const p = rows[0];
  if (!p || !p.active || p.display_price_minor == null) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    id: p.id,
    name: p.display_name,
    country: p.country,
    region: p.region,
    operator: p.operator,
    dataAmount: Number(p.data_amount),
    validity: p.validity,
    networkType: p.network_type,
    currency: p.currency,
    priceMinor: Number(p.display_price_minor),
    inStock: Number(p.supplier_count) > 0,
  });
}
