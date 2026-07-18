import { query } from "@/lib/db";
import { getProviderMetricsSummary } from "@/lib/vendors/providerMetrics";
import { isCircuitOpen } from "@/lib/http/resilientHttp";
import { compareCandidates, computeProviderState, routeVendor, ProviderState, RoutingCandidate } from "@/vendors/routing";
import { getAdapterById } from "@/vendors/registry";

// One assembled row per provider for the operations dashboard. Pulls together
// vendor config, per-call metrics, 24h transaction outcomes, computed state,
// the routing decision, and the latest sync/webhook activity.
export interface ProviderDashboardRow {
  id: string;
  kind: string;
  priority: number;
  enabled: boolean;
  maintenance: boolean;
  registered: boolean;
  healthy: boolean;
  state: ProviderState;
  circuitOpen: boolean;
  lastHealthCheck: string | null;
  lastHealthLatencyMs: number | null;

  floatBalanceMinor: number | null;
  floatThresholdMinor: number;
  costWeight: number;

  // Per-call metrics (trailing window).
  calls: number;
  successRatePct: number | null;
  timeoutRatePct: number | null;
  failureRatePct: number | null;
  circuitOpenCount: number;
  latencyP50Ms: number | null;
  latencyP95Ms: number | null;

  // Transaction-level outcomes (24h).
  txnCount24h: number;
  delivered24h: number;
  failed24h: number;
  successRate24hPct: number | null;

  // Routing.
  chosenForKind: boolean; // routeVendor would pick this provider for its kind
  routingRank: number | null; // 1 = best among routable in its kind
  routingPool: "healthy" | "degraded" | "none";

  // Ops activity.
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncUpserted: number | null;
  lastSyncDeactivated: number | null;
  lastSyncSkippedMargin: number | null;
  lastWebhookAt: string | null;
  lastWebhookStatus: string | null;
  webhookFailedCount: number;
  webhookRetrySum: number;
}

export async function getProviderDashboard(windowMinutes = 60): Promise<ProviderDashboardRow[]> {
  const { rows: vendors } = await query<{
    id: string;
    kind: string;
    priority: number;
    enabled: boolean;
    maintenance: boolean;
    healthy: boolean;
    last_health_check: string | null;
    last_health_latency_ms: number | null;
    float_balance_minor: string | null;
    float_threshold_minor: string | null;
    cost_weight: string | null;
  }>(
    `SELECT id, kind, priority, enabled, maintenance, healthy, last_health_check, last_health_latency_ms,
            float_balance_minor, float_threshold_minor, cost_weight
       FROM vendors ORDER BY kind, priority`
  );

  const metrics = await getProviderMetricsSummary(windowMinutes);
  const metricsByProvider = new Map(metrics.map((m) => [m.provider, m]));

  // 24h transaction outcomes per vendor.
  const { rows: txn } = await query<{ vendor: string; total: string; delivered: string; failed: string }>(
    `SELECT vendor,
            COUNT(*) FILTER (WHERE status IN ('delivered','failed')) AS total,
            COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
            COUNT(*) FILTER (WHERE status = 'failed') AS failed
       FROM transactions WHERE vendor IS NOT NULL AND created_at >= now() - interval '24 hours'
       GROUP BY vendor`
  );
  const txnByVendor = new Map(txn.map((t) => [t.vendor, t]));

  const { rows: syncRuns } = await query<{
    vendor: string;
    status: string;
    plans_upserted: number;
    plans_deactivated: number;
    plans_skipped_margin: number;
    started_at: string;
  }>(
    `SELECT DISTINCT ON (vendor) vendor, status, plans_upserted, plans_deactivated, plans_skipped_margin, started_at
       FROM catalog_sync_runs ORDER BY vendor, started_at DESC`
  );
  const syncByVendor = new Map(syncRuns.map((s) => [s.vendor, s]));

  const { rows: lastHooks } = await query<{ vendor: string; status: string; received_at: string }>(
    `SELECT DISTINCT ON (vendor) vendor, status, received_at
       FROM webhook_events ORDER BY vendor, received_at DESC`
  );
  const hookByVendor = new Map(lastHooks.map((h) => [h.vendor, h]));

  const { rows: hookStats } = await query<{ vendor: string; failed: string; retries: string }>(
    `SELECT vendor, COUNT(*) FILTER (WHERE status = 'failed') AS failed, COALESCE(SUM(retry_count), 0) AS retries
       FROM webhook_events GROUP BY vendor`
  );
  const hookStatsByVendor = new Map(hookStats.map((h) => [h.vendor, h]));

  // Build routing candidates and resolve the routing decision per kind.
  const candidates: RoutingCandidate[] = vendors.map((v) => {
    const m = metricsByProvider.get(v.id);
    return {
      id: v.id,
      priority: v.priority,
      healthy: v.healthy,
      enabled: v.enabled,
      maintenance: v.maintenance,
      circuitOpen: isCircuitOpen(v.id),
      registered: Boolean(getAdapterById(v.id)),
      floatBalanceMinor: v.float_balance_minor !== null ? Number(v.float_balance_minor) : null,
      floatThresholdMinor: v.float_threshold_minor !== null ? Number(v.float_threshold_minor) : 0,
      costWeight: v.cost_weight !== null ? Number(v.cost_weight) : 1,
      successRatePct: m?.successRatePct ?? null,
      timeoutRatePct: m?.timeoutRatePct ?? null,
      latencyP95Ms: m?.latencyP95Ms ?? null,
    };
  });
  const candidateById = new Map(candidates.map((c) => [c.id, c]));

  // Per-kind routing: chosen provider + rank of each routable candidate.
  const chosenByKind = new Map<string, string | null>();
  const rankById = new Map<string, number>();
  const kinds = [...new Set(vendors.map((v) => v.kind))];
  for (const kind of kinds) {
    const inKind = candidates.filter((c) => vendors.find((v) => v.id === c.id)?.kind === kind);
    const decision = routeVendor(inKind);
    chosenByKind.set(kind, decision.chosen);
    // Rank the candidates in the active pool by the same comparator routeVendor uses.
    const routable = inKind.filter((c) => {
      const s = computeProviderState(c);
      return decision.pool === "healthy" ? s === "healthy" : decision.pool === "degraded" ? s === "degraded" : false;
    });
    [...routable].sort(compareCandidates).forEach((c, i) => rankById.set(c.id, i + 1));
  }

  return vendors.map((v): ProviderDashboardRow => {
    const c = candidateById.get(v.id)!;
    const m = metricsByProvider.get(v.id);
    const t = txnByVendor.get(v.id);
    const s = syncByVendor.get(v.id);
    const lh = hookByVendor.get(v.id);
    const hs = hookStatsByVendor.get(v.id);
    const total = t ? Number(t.total) : 0;
    const delivered = t ? Number(t.delivered) : 0;
    const failure = m && m.calls > 0 ? Math.round((m.failure / m.calls) * 100) : m ? null : null;
    const state = computeProviderState(c);
    const kindDecision = chosenByKind.get(v.kind) ?? null;

    return {
      id: v.id,
      kind: v.kind,
      priority: v.priority,
      enabled: v.enabled,
      maintenance: v.maintenance,
      registered: c.registered,
      healthy: v.healthy,
      state,
      circuitOpen: c.circuitOpen,
      lastHealthCheck: v.last_health_check,
      lastHealthLatencyMs: v.last_health_latency_ms,
      floatBalanceMinor: c.floatBalanceMinor,
      floatThresholdMinor: c.floatThresholdMinor,
      costWeight: c.costWeight,
      calls: m?.calls ?? 0,
      successRatePct: m?.successRatePct ?? null,
      timeoutRatePct: m?.timeoutRatePct ?? null,
      failureRatePct: failure,
      circuitOpenCount: m?.circuitOpen ?? 0,
      latencyP50Ms: m?.latencyP50Ms ?? null,
      latencyP95Ms: m?.latencyP95Ms ?? null,
      txnCount24h: total,
      delivered24h: delivered,
      failed24h: t ? Number(t.failed) : 0,
      successRate24hPct: total > 0 ? Math.round((delivered / total) * 100) : null,
      chosenForKind: kindDecision === v.id,
      routingRank: rankById.get(v.id) ?? null,
      routingPool: kindDecision ? (state === "healthy" ? "healthy" : "degraded") : "none",
      lastSyncAt: s?.started_at ?? null,
      lastSyncStatus: s?.status ?? null,
      lastSyncUpserted: s ? Number(s.plans_upserted) : null,
      lastSyncDeactivated: s ? Number(s.plans_deactivated) : null,
      lastSyncSkippedMargin: s ? Number(s.plans_skipped_margin) : null,
      lastWebhookAt: lh?.received_at ?? null,
      lastWebhookStatus: lh?.status ?? null,
      webhookFailedCount: hs ? Number(hs.failed) : 0,
      webhookRetrySum: hs ? Number(hs.retries) : 0,
    };
  });
}
