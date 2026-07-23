import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getAdapterById } from "@/vendors/registry";
import type { RawSupplierPlan } from "./matching";
import { upsertSupplierPlan, repriceProduct } from "./repository";

// Supplier import engine. Every supplier — eSIMGo, Airalo, BNESIM, Roamify or a
// custom CSV — becomes the same normalised RawSupplierPlan and flows through
// auto-matching (repository.upsertSupplierPlan) and repricing. Adding a supplier
// is a new mapper, never a schema or engine change.

export interface SupplierPlanInput extends RawSupplierPlan {
  sku: string;
  costMinor: number;
  currency?: string;
  stockStatus?: string;
  raw?: unknown;
}

export interface ImportResult {
  runId: string;
  imported: number;
  updated: number;
  failed: number;
  durationMs: number;
  errors: string[];
}

// Whether a supplier SKU already exists (so we can report imported vs updated).
async function knownSkus(supplierId: string): Promise<Set<string>> {
  const { rows } = await query<{ supplier_sku: string }>(
    `SELECT supplier_sku FROM supplier_products WHERE supplier_id = $1`,
    [supplierId]
  );
  return new Set(rows.map((r) => r.supplier_sku));
}

export async function importSupplierPlans(
  supplierId: string,
  plans: SupplierPlanInput[],
  opts: { source: "csv" | "api"; actor?: string; deactivateMissing?: boolean }
): Promise<ImportResult> {
  const startedAt = Date.now();
  const { rows: runRows } = await query<{ id: string }>(
    `INSERT INTO import_runs (supplier_id, source, status, actor) VALUES ($1, $2, 'running', $3) RETURNING id`,
    [supplierId, opts.source, opts.actor ?? null]
  );
  const runId = runRows[0].id;

  const existing = await knownSkus(supplierId);
  const affected = new Set<string>();
  const errors: string[] = [];
  let imported = 0;
  let updated = 0;
  let failed = 0;
  const seenSkus: string[] = [];

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    try {
      if (!plan.sku || !Number.isFinite(plan.costMinor) || plan.costMinor <= 0) {
        throw new Error(`row ${i + 1}: sku and a positive cost are required`);
      }
      const productId = await upsertSupplierPlan(supplierId, plan);
      affected.add(productId);
      seenSkus.push(plan.sku);
      if (existing.has(plan.sku)) updated++;
      else imported++;
    } catch (err) {
      failed++;
      if (errors.length < 25) errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  // Full-catalog sync: retire this supplier's SKUs that vanished from the feed
  // (e.g. discontinued), then reprice so the listing drops them.
  if (opts.deactivateMissing && seenSkus.length > 0) {
    const { rows: retired } = await query<{ catalog_product_id: string }>(
      `UPDATE supplier_products SET active = false, last_updated = now()
        WHERE supplier_id = $1 AND active AND NOT (supplier_sku = ANY($2::text[]))
        RETURNING catalog_product_id`,
      [supplierId, seenSkus]
    );
    retired.forEach((r) => affected.add(r.catalog_product_id));
  }

  // Reprice every touched product from its new lowest cost.
  for (const productId of affected) {
    try {
      await repriceProduct(productId);
    } catch (err) {
      if (errors.length < 25) errors.push(`reprice ${productId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const durationMs = Date.now() - startedAt;
  await query(
    `UPDATE import_runs
       SET status = $2, products_imported = $3, products_updated = $4, products_failed = $5,
           duration_ms = $6, error = $7, finished_at = now()
     WHERE id = $1`,
    [runId, failed && imported + updated === 0 ? "failed" : "completed", imported, updated, failed, durationMs, errors[0] ?? null]
  );

  await logAudit(opts.actor ?? "system:import", "supplier_import_completed", "supplier", supplierId, {
    runId,
    source: opts.source,
    imported,
    updated,
    failed,
    products: affected.size,
  });

  return { runId, imported, updated, failed, durationMs, errors };
}

// API sync: pull the supplier's live catalogue via its registered adapter's
// listPlans() and import it. Maps our generic VendorPlan into the marketplace's
// RawSupplierPlan using the meta the adapter already normalises.
export async function syncSupplierViaApi(
  supplierId: string,
  actor?: string
): Promise<ImportResult> {
  const adapter = getAdapterById(supplierId);
  if (!adapter || typeof adapter.listPlans !== "function") {
    throw new Error(`Supplier ${supplierId} has no API catalogue (listPlans) in this build`);
  }

  const vendorPlans = await adapter.listPlans("esim");
  const plans: SupplierPlanInput[] = vendorPlans.map((p) => {
    const meta = (p.meta ?? {}) as Record<string, unknown>;
    return {
      sku: p.externalId,
      costMinor: p.costMinor,
      currency: p.currency,
      stockStatus: "in_stock",
      country: (meta.location as string)?.split(",")[0] ?? p.network,
      region: meta.type === "region" || meta.type === "global" ? String(meta.place ?? meta.type) : null,
      operator: null,
      data: meta.dataMb ? `${Number(meta.dataMb)}MB` : undefined,
      dataUnit: "MB",
      validity: meta.validityDays as number | undefined,
      validityUnit: "DAY",
      networkType: (meta.speed as string) ?? null,
      category: "esim",
      raw: p,
    };
  });

  return importSupplierPlans(supplierId, plans, { source: "api", actor, deactivateMissing: true });
}
