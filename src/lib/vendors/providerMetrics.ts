import { query } from "@/lib/db";

export type ProviderOperation = "purchase" | "verify" | "balance" | "health" | "catalog" | "other";
export type ProviderOutcome = "success" | "failure" | "timeout" | "circuit_open";

// Records one external provider call. Best-effort: observability must NEVER
// break or slow the call path, so failures here are swallowed.
export async function recordProviderCall(input: {
  provider: string;
  operation: ProviderOperation;
  outcome: ProviderOutcome;
  latencyMs?: number | null;
  httpStatus?: number | null;
  error?: string | null;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO provider_metrics (provider, operation, outcome, latency_ms, http_status, error)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [input.provider, input.operation, input.outcome, input.latencyMs ?? null, input.httpStatus ?? null, input.error ?? null]
    );
  } catch {
    // metrics are non-critical; never propagate
  }
}

export interface ProviderMetricsSummary {
  provider: string;
  windowMinutes: number;
  calls: number;
  success: number;
  failure: number;
  timeout: number;
  circuitOpen: number;
  successRatePct: number | null; // null = no calls in window
  timeoutRatePct: number | null;
  latencyP50Ms: number | null;
  latencyP95Ms: number | null;
}

// Per-provider call metrics over a trailing window: success/failure/timeout
// rates and latency percentiles. Complements vendorMonitoring (which derives
// success rate from transaction outcomes) with per-call latency + timeout data.
export async function getProviderMetricsSummary(windowMinutes = 60): Promise<ProviderMetricsSummary[]> {
  const { rows } = await query<{
    provider: string;
    calls: string;
    success: string;
    failure: string;
    timeout: string;
    circuit_open: string;
    p50: string | null;
    p95: string | null;
  }>(
    `SELECT
       provider,
       COUNT(*)                                            AS calls,
       COUNT(*) FILTER (WHERE outcome = 'success')         AS success,
       COUNT(*) FILTER (WHERE outcome = 'failure')         AS failure,
       COUNT(*) FILTER (WHERE outcome = 'timeout')         AS timeout,
       COUNT(*) FILTER (WHERE outcome = 'circuit_open')    AS circuit_open,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms) FILTER (WHERE latency_ms IS NOT NULL) AS p50,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) FILTER (WHERE latency_ms IS NOT NULL) AS p95
     FROM provider_metrics
     WHERE created_at >= now() - ($1 || ' minutes')::interval
     GROUP BY provider
     ORDER BY provider`,
    [String(windowMinutes)]
  );

  return rows.map((r) => {
    const calls = Number(r.calls);
    const success = Number(r.success);
    const timeout = Number(r.timeout);
    return {
      provider: r.provider,
      windowMinutes,
      calls,
      success,
      failure: Number(r.failure),
      timeout,
      circuitOpen: Number(r.circuit_open),
      successRatePct: calls > 0 ? Math.round((success / calls) * 100) : null,
      timeoutRatePct: calls > 0 ? Math.round((timeout / calls) * 100) : null,
      latencyP50Ms: r.p50 !== null ? Math.round(Number(r.p50)) : null,
      latencyP95Ms: r.p95 !== null ? Math.round(Number(r.p95)) : null,
    };
  });
}
