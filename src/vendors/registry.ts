import { query } from "@/lib/db";
import { sendExternalAlert } from "@/lib/alerts/externalAlert";
import { logAudit } from "@/lib/audit";
import { getProviderMetricsSummary } from "@/lib/vendors/providerMetrics";
import { isCircuitOpen } from "@/lib/http/resilientHttp";
import { RoutingCandidate, routeVendor } from "./routing";
import { VendorAdapter, VendorServiceType } from "./types";
import { mockVtuAdapter, mockVtuAdapter2 } from "./mockVtu";

// Add real aggregators here as they're wired up (e.g. reloadly, vtu_ng).
// Which one actually gets used for a given purchase is decided by
// selectVendor() below, never by an inline choice at the call site.
const ADAPTERS: Record<string, VendorAdapter> = {
  [mockVtuAdapter.id]: mockVtuAdapter,
  [mockVtuAdapter2.id]: mockVtuAdapter2,
};

const SERVICE_TYPE_TO_VENDOR_KIND: Record<VendorServiceType, string> = {
  airtime: "vtu",
  data: "vtu",
  cable: "vtu",
  electricity: "vtu",
  exam_pin: "vtu",
  betting: "vtu",
  gift_card: "vtu",
  intl_topup: "vtu",
  esim: "vtu",
};

// Look up a specific adapter by its id (e.g. to re-verify a transaction against
// the vendor that originally fulfilled it, in reservation recovery). Returns
// undefined if that vendor isn't registered in this build.
export function getAdapterById(id: string): VendorAdapter | undefined {
  return ADAPTERS[id];
}

// Adapters that expose a plan catalog (used by the catalog sync pipeline).
export function getCatalogAdapters(): VendorAdapter[] {
  return Object.values(ADAPTERS).filter((a) => typeof a.listPlans === "function");
}

export class NoHealthyVendorError extends Error {
  constructor(kind: string) {
    super(`No healthy vendor available for kind=${kind}`);
    this.name = "NoHealthyVendorError";
  }
}

// Chooses the best vendor for this service type using the routing policy
// (see routing.ts): eligibility by enabled/healthy/float, then ranked by recent
// success rate, cost and latency, with priority as the final tiebreak. All the
// inputs live in the `vendors` table + provider_metrics, so ops changes reroute
// future purchases with no deploy. The decision itself is delegated to a pure,
// tested function so no routing logic leaks into the business layer.
export async function selectVendor(serviceType: VendorServiceType): Promise<VendorAdapter> {
  const kind = SERVICE_TYPE_TO_VENDOR_KIND[serviceType];

  const { rows } = await query<{
    id: string;
    priority: number;
    healthy: boolean;
    enabled: boolean;
    maintenance: boolean;
    float_balance_minor: string | null;
    float_threshold_minor: string | null;
    cost_weight: string | null;
  }>(
    `SELECT id, priority, healthy, enabled, maintenance, float_balance_minor, float_threshold_minor, cost_weight
       FROM vendors WHERE kind = $1`,
    [kind]
  );

  const metrics = await getProviderMetricsSummary(60);
  const byProvider = new Map(metrics.map((m) => [m.provider, m]));

  const candidates: RoutingCandidate[] = rows.map((r) => {
    const m = byProvider.get(r.id);
    return {
      id: r.id,
      priority: r.priority,
      healthy: r.healthy,
      enabled: r.enabled,
      maintenance: r.maintenance,
      circuitOpen: isCircuitOpen(r.id),
      registered: Boolean(ADAPTERS[r.id]),
      floatBalanceMinor: r.float_balance_minor !== null ? Number(r.float_balance_minor) : null,
      floatThresholdMinor: r.float_threshold_minor !== null ? Number(r.float_threshold_minor) : 0,
      costWeight: r.cost_weight !== null ? Number(r.cost_weight) : 1,
      successRatePct: m?.successRatePct ?? null,
      timeoutRatePct: m?.timeoutRatePct ?? null,
      latencyP95Ms: m?.latencyP95Ms ?? null,
    };
  });

  const { chosen } = routeVendor(candidates);
  if (!chosen || !ADAPTERS[chosen]) throw new NoHealthyVendorError(kind);
  return ADAPTERS[chosen];
}

// Called on every /api/cron/tick (see src/app/api/cron/tick) and from the
// Provider Monitoring page's manual "Run check now". Measures latency
// around each adapter's health() call, persists it alongside healthy/
// last_health_check, and appends a system audit_log row per check —
// that log is the health-check history the monitoring page reads, rather
// than a bespoke table.
export async function refreshVendorHealth(): Promise<void> {
  for (const adapter of Object.values(ADAPTERS)) {
    const { rows: before } = await query<{ healthy: boolean }>(`SELECT healthy FROM vendors WHERE id = $1`, [adapter.id]);

    const startedAt = Date.now();
    const healthy = await adapter.health();
    const latencyMs = Date.now() - startedAt;

    await query(
      `UPDATE vendors SET healthy = $2, last_health_check = now(), last_health_latency_ms = $3 WHERE id = $1`,
      [adapter.id, healthy, latencyMs]
    );
    await logAudit("system:cron", "vendor_health_check", "vendor", adapter.id, { healthy, latencyMs });

    if (before[0]?.healthy && !healthy) {
      await sendExternalAlert("provider_outage", `${adapter.id} failed automated health check`, { vendor: adapter.id });
    }
  }
}
