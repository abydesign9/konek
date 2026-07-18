import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendExternalAlert } from "@/lib/alerts/externalAlert";
import { VendorAdapter, VendorServiceType } from "@/vendors/types";
import { decidePrice, PricingRule } from "./pricing";

// Catalog synchronization pipeline.
//   * Pulls plans via adapter.listPlans() (real adapters call providers through
//     the shared HTTP resilience layer).
//   * Normalizes into catalog_items, preserving internal ids (upsert on the
//     natural key), never deleting — plans that disappear are marked inactive.
//   * Selling price is independent of provider cost: derived via a markup rule,
//     or kept as-is when price_locked (manual override).
//   * Fail-closed margin protection: if a plan's margin would fall below the
//     minimum, the new provider cost is NOT published, the old pricing keeps
//     serving, an ops alert fires, and the incident is logged.
//   * Every run is recorded in catalog_sync_runs (counts, duration, failures).

const DEFAULT_RULE: PricingRule = { markupBps: 500, minMarginBps: 200 };

export interface SyncRunResult {
  vendor: string;
  status: "completed" | "failed" | "partial";
  upserted: number;
  deactivated: number;
  skippedMargin: number;
  durationMs: number;
  error?: string;
}

async function getRule(serviceType: string): Promise<PricingRule> {
  const { rows } = await query<{ markup_bps: number; min_margin_bps: number }>(
    `SELECT markup_bps, min_margin_bps FROM pricing_rules
      WHERE service_type = $1 OR service_type IS NULL
      ORDER BY service_type NULLS LAST LIMIT 1`,
    [serviceType]
  );
  const r = rows[0];
  return r ? { markupBps: r.markup_bps, minMarginBps: r.min_margin_bps } : DEFAULT_RULE;
}

interface ExistingItem {
  price_minor: string;
  cost_minor: string;
  price_locked: boolean;
}

export async function syncVendorCatalog(
  adapter: VendorAdapter,
  serviceTypes: VendorServiceType[]
): Promise<SyncRunResult> {
  const startedAt = Date.now();
  const runId = (
    await query<{ id: string }>(
      `INSERT INTO catalog_sync_runs (vendor, status) VALUES ($1, 'partial') RETURNING id`,
      [adapter.id]
    )
  ).rows[0].id;

  let upserted = 0;
  let deactivated = 0;
  let skippedMargin = 0;
  const errors: string[] = [];

  for (const serviceType of serviceTypes) {
    if (!adapter.listPlans) continue;
    try {
      const rule = await getRule(serviceType);
      const plans = await adapter.listPlans(serviceType);
      const seen: string[] = [];

      for (const plan of plans) {
        seen.push(plan.externalId);
        const { rows: existingRows } = await query<ExistingItem>(
          `SELECT price_minor, cost_minor, price_locked FROM catalog_items
            WHERE vendor = $1 AND service_type = $2 AND external_id = $3`,
          [adapter.id, serviceType, plan.externalId]
        );
        const existing = existingRows[0];

        const decision = decidePrice({
          costMinor: plan.costMinor,
          rule,
          lockedPriceMinor: existing?.price_locked ? Number(existing.price_minor) : null,
        });

        if (!decision.publish) {
          // Fail closed: keep existing pricing (or skip a brand-new plan), alert.
          skippedMargin += 1;
          await sendExternalAlert(
            "margin_breach",
            `${adapter.id}/${serviceType}/${plan.externalId} held back — margin ${decision.marginBps}bps < min ${rule.minMarginBps}bps`,
            { vendor: adapter.id, serviceType, externalId: plan.externalId, costMinor: plan.costMinor, priceMinor: decision.priceMinor }
          );
          await logAudit("system:catalog", "margin_breach", "catalog_item", plan.externalId, {
            vendor: adapter.id,
            serviceType,
            costMinor: plan.costMinor,
            marginBps: decision.marginBps,
            minMarginBps: rule.minMarginBps,
          });
          continue;
        }

        // price_locked rows keep their manual price; others take the derived one.
        const priceMinor = existing?.price_locked ? Number(existing.price_minor) : decision.priceMinor;

        await query(
          `INSERT INTO catalog_items
             (vendor, service_type, external_id, name, network, cost_minor, price_minor, currency, meta, active, synced_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true, now())
           ON CONFLICT (vendor, service_type, external_id) DO UPDATE SET
             name = EXCLUDED.name,
             network = EXCLUDED.network,
             last_cost_minor = catalog_items.cost_minor,
             cost_minor = EXCLUDED.cost_minor,
             price_minor = CASE WHEN catalog_items.price_locked THEN catalog_items.price_minor ELSE EXCLUDED.price_minor END,
             meta = EXCLUDED.meta,
             active = true,
             synced_at = now()`,
          [
            adapter.id,
            serviceType,
            plan.externalId,
            plan.name,
            plan.network,
            plan.costMinor,
            priceMinor,
            plan.currency,
            JSON.stringify(plan.meta ?? {}),
          ]
        );
        upserted += 1;
      }

      // Deactivate (never delete) plans that vanished from the provider's list.
      const { rowCount } = await query(
        `UPDATE catalog_items SET active = false, synced_at = now()
          WHERE vendor = $1 AND service_type = $2 AND active = true AND NOT (external_id = ANY($3))`,
        [adapter.id, serviceType, seen]
      );
      deactivated += rowCount ?? 0;
    } catch (err) {
      errors.push(`${serviceType}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  const durationMs = Date.now() - startedAt;
  const status: SyncRunResult["status"] = errors.length === 0 ? "completed" : upserted > 0 ? "partial" : "failed";

  await query(
    `UPDATE catalog_sync_runs
       SET status = $2, plans_upserted = $3, plans_deactivated = $4, plans_skipped_margin = $5,
           duration_ms = $6, error = $7, finished_at = now()
     WHERE id = $1`,
    [runId, status, upserted, deactivated, skippedMargin, durationMs, errors.length ? errors.join("; ") : null]
  );

  if (status === "failed") {
    await sendExternalAlert("catalog_sync_failed", `Catalog sync failed for ${adapter.id}`, {
      vendor: adapter.id,
      errors: errors.join("; "),
    });
  }

  return {
    vendor: adapter.id,
    status,
    upserted,
    deactivated,
    skippedMargin,
    durationMs,
    error: errors.length ? errors.join("; ") : undefined,
  };
}

const SYNCED_SERVICE_TYPES: VendorServiceType[] = ["data", "cable", "exam_pin", "gift_card", "esim"];

// Cron entrypoint: sync the catalog from the given adapters.
export async function runCatalogSync(adapters: VendorAdapter[]): Promise<SyncRunResult[]> {
  const results: SyncRunResult[] = [];
  for (const adapter of adapters) {
    results.push(await syncVendorCatalog(adapter, SYNCED_SERVICE_TYPES));
  }
  return results;
}

// Throttled entrypoint for the cron tick — plans change slowly, so only sync
// when the last run is older than minIntervalMinutes (default hourly).
export async function runCatalogSyncIfDue(
  adapters: VendorAdapter[],
  minIntervalMinutes = 60
): Promise<{ ran: boolean; results: SyncRunResult[] }> {
  const { rows } = await query<{ last: string | null }>(
    `SELECT max(started_at) AS last FROM catalog_sync_runs`
  );
  const last = rows[0]?.last ? new Date(rows[0].last).getTime() : 0;
  if (Date.now() - last < minIntervalMinutes * 60 * 1000) {
    return { ran: false, results: [] };
  }
  return { ran: true, results: await runCatalogSync(adapters) };
}
