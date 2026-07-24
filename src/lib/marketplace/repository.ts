import { query, withTransaction } from "@/lib/db";
import type { PricingRule } from "./pricing";
import { computePrice } from "./pricing";
import { normalisePlan, displayNameFor, type RawSupplierPlan } from "./matching";

// DB access + repricing for the marketplace. Prices are always recomputed from
// the current lowest supplier cost through the pricing engine — never written by
// hand — except where an admin override is set on the product.

export async function loadPricingRules(): Promise<PricingRule[]> {
  const { rows } = await query<{
    id: string;
    name: string;
    min_cost_minor: string;
    max_cost_minor: string | null;
    markup_pct: string;
    category: string | null;
    country: string | null;
    supplier_id: string | null;
    priority: number;
    active: boolean;
  }>(`SELECT id, name, min_cost_minor, max_cost_minor, markup_pct, category, country, supplier_id, priority, active
      FROM marketplace_pricing_rules WHERE active = true`);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    minCostMinor: Number(r.min_cost_minor),
    maxCostMinor: r.max_cost_minor == null ? null : Number(r.max_cost_minor),
    markupPct: Number(r.markup_pct),
    category: r.category,
    country: r.country,
    supplierId: r.supplier_id,
    priority: r.priority,
    active: r.active,
  }));
}

// Find the catalog product for a plan's fingerprint, or create it. Returns its id.
async function upsertCatalogProduct(plan: RawSupplierPlan, currency: string): Promise<string> {
  const n = normalisePlan(plan);
  const { rows } = await query<{ id: string }>(
    `INSERT INTO catalog_products
       (fingerprint, country, region, operator, data_amount, data_unit, validity, validity_unit, network_type, category, currency, display_name)
     VALUES ($1,$2,$3,$4,$5,'GB',$6,'DAY',$7,$8,$9,$10)
     ON CONFLICT (fingerprint) DO UPDATE SET updated_at = now()
     RETURNING id`,
    [
      n.fingerprint,
      n.country,
      n.region,
      n.operator,
      n.dataAmount,
      n.validity,
      n.networkType,
      n.category,
      currency,
      displayNameFor(n),
    ]
  );
  return rows[0].id;
}

// Recompute lowest cost + display price for one product from its active,
// in-stock supplier SKUs, honouring any admin override. Called after every
// import so the customer price is never stale.
export async function repriceProduct(productId: string): Promise<void> {
  await withTransaction(async (client) => {
    const { rows: prod } = await client.query<{
      category: string;
      country: string | null;
      currency: string;
      price_override_minor: string | null;
      markup_override_pct: string | null;
      promo_price_minor: string | null;
      override_expires_at: string | null;
    }>(
      `SELECT category, country, currency, price_override_minor, markup_override_pct, promo_price_minor, override_expires_at
       FROM catalog_products WHERE id = $1 FOR UPDATE`,
      [productId]
    );
    const p = prod[0];
    if (!p) return;

    const { rows: costRows } = await client.query<{ lowest: string | null; supplier_id: string | null }>(
      `SELECT MIN(supplier_cost_minor) AS lowest,
              (SELECT supplier_id FROM supplier_products
                WHERE catalog_product_id = $1 AND active AND stock_status <> 'out_of_stock'
                ORDER BY supplier_cost_minor ASC, supplier_id ASC LIMIT 1) AS supplier_id
       FROM supplier_products
       WHERE catalog_product_id = $1 AND active AND stock_status <> 'out_of_stock'`,
      [productId]
    );
    const lowest = costRows[0]?.lowest == null ? null : Number(costRows[0].lowest);

    // No live supplier -> deactivate the listing (nothing to sell).
    if (lowest == null) {
      await client.query(`UPDATE catalog_products SET active = false, lowest_supplier_cost_minor = NULL, updated_at = now() WHERE id = $1`, [productId]);
      return;
    }

    const rules = await loadPricingRules();
    const result = computePrice(
      lowest,
      rules,
      { category: p.category, country: p.country },
      {
        priceOverrideMinor: p.price_override_minor == null ? null : Number(p.price_override_minor),
        markupOverridePct: p.markup_override_pct == null ? null : Number(p.markup_override_pct),
        promoPriceMinor: p.promo_price_minor == null ? null : Number(p.promo_price_minor),
        overrideExpiresAt: p.override_expires_at,
      }
    );

    await client.query(
      `UPDATE catalog_products
         SET lowest_supplier_cost_minor = $2,
             display_price_minor = $3,
             recommended_supplier_id = COALESCE(recommended_supplier_id, $4),
             active = true,
             updated_at = now()
       WHERE id = $1`,
      [productId, lowest, result.priceMinor, costRows[0]?.supplier_id ?? null]
    );
  });
}

// Upsert one supplier's SKU (updates cost/stock in place, never duplicates).
// Returns the affected catalog product id so the caller can reprice it.
export async function upsertSupplierPlan(
  supplierId: string,
  plan: RawSupplierPlan & { sku: string; costMinor: number; currency?: string; stockStatus?: string; raw?: unknown }
): Promise<string> {
  const currency = plan.currency ?? "USD";
  const catalogProductId = await upsertCatalogProduct(plan, currency);

  await query(
    `INSERT INTO supplier_products
       (catalog_product_id, supplier_id, supplier_sku, supplier_cost_minor, currency, stock_status, raw, active, last_updated)
     VALUES ($1,$2,$3,$4,$5,$6,$7,true, now())
     ON CONFLICT (supplier_id, supplier_sku) DO UPDATE
       SET catalog_product_id = EXCLUDED.catalog_product_id,
           supplier_cost_minor = EXCLUDED.supplier_cost_minor,
           currency = EXCLUDED.currency,
           stock_status = EXCLUDED.stock_status,
           raw = EXCLUDED.raw,
           active = true,
           last_updated = now()`,
    [catalogProductId, supplierId, plan.sku, plan.costMinor, currency, plan.stockStatus ?? "in_stock", plan.raw ? JSON.stringify(plan.raw) : null]
  );

  return catalogProductId;
}
