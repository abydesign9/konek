// Provider routing policy + state machine — pure and testable, no DB or provider
// specifics. The registry gathers the inputs (vendor rows, live metrics, circuit
// state) and delegates the decision here, so routing logic never leaks into the
// business layer.

export type ProviderState =
  | "healthy"
  | "degraded"
  | "circuit_open"
  | "low_float"
  | "maintenance"
  | "disabled";

// Thresholds beyond which a provider is considered degraded (steer away before
// it starts failing real transactions). Exported so ops can tune them.
export const DEGRADED_SUCCESS_PCT = 90;
export const DEGRADED_TIMEOUT_PCT = 20;
export const DEGRADED_LATENCY_P95_MS = 5_000;

export interface RoutingCandidate {
  id: string;
  priority: number; // lower = preferred (final tiebreak)
  healthy: boolean; // last health check
  enabled: boolean; // ops kill switch
  maintenance: boolean; // ops-declared maintenance window
  circuitOpen: boolean; // breaker tripped in this instance
  registered: boolean; // an adapter is wired up for this id in this build
  floatBalanceMinor: number | null; // null = unknown (don't block on missing data)
  floatThresholdMinor: number;
  costWeight: number; // relative cost, lower = cheaper
  successRatePct: number | null; // trailing-window success rate (null = no data)
  timeoutRatePct: number | null; // trailing-window timeout rate
  latencyP95Ms: number | null; // trailing-window p95 latency
}

// Resolves a provider's effective state. Order matters: hard/ops states first,
// then live-signal states, then the degradation heuristic.
export function computeProviderState(c: RoutingCandidate): ProviderState {
  if (!c.enabled) return "disabled";
  if (c.maintenance) return "maintenance";
  if (c.circuitOpen) return "circuit_open";
  if (c.floatBalanceMinor !== null && c.floatBalanceMinor < c.floatThresholdMinor) return "low_float";
  if (!c.registered) return "disabled"; // no adapter in this build -> not usable
  if (!c.healthy) return "degraded";
  if (c.successRatePct !== null && c.successRatePct < DEGRADED_SUCCESS_PCT) return "degraded";
  if (c.timeoutRatePct !== null && c.timeoutRatePct > DEGRADED_TIMEOUT_PCT) return "degraded";
  if (c.latencyP95Ms !== null && c.latencyP95Ms > DEGRADED_LATENCY_P95_MS) return "degraded";
  return "healthy";
}

function successBand(pct: number | null): number {
  return Math.floor((pct ?? 100) / 10);
}

// Deterministic ordering: higher success band → cheaper cost → lower p95 → lower priority.
export function compareCandidates(a: RoutingCandidate, b: RoutingCandidate): number {
  const band = successBand(b.successRatePct) - successBand(a.successRatePct);
  if (band !== 0) return band;
  if (a.costWeight !== b.costWeight) return a.costWeight - b.costWeight;
  const la = a.latencyP95Ms ?? 0;
  const lb = b.latencyP95Ms ?? 0;
  if (la !== lb) return la - lb;
  return a.priority - b.priority;
}

export interface RoutingDecision {
  chosen: string | null;
  states: Record<string, ProviderState>;
  pool: "healthy" | "degraded" | "none"; // which tier the choice came from
}

// Picks the best vendor, preferring healthy providers and only falling back to
// degraded ones when no healthy provider is available — so we avoid degraded
// providers before they begin failing transactions, but never strand traffic
// if degraded is all that's left. disabled/maintenance/circuit_open/low_float
// are never routed to.
export function routeVendor(candidates: RoutingCandidate[]): RoutingDecision {
  const states: Record<string, ProviderState> = {};
  const healthy: RoutingCandidate[] = [];
  const degraded: RoutingCandidate[] = [];
  for (const c of candidates) {
    const s = computeProviderState(c);
    states[c.id] = s;
    if (s === "healthy") healthy.push(c);
    else if (s === "degraded") degraded.push(c);
  }
  if (healthy.length > 0) return { chosen: [...healthy].sort(compareCandidates)[0].id, states, pool: "healthy" };
  if (degraded.length > 0) return { chosen: [...degraded].sort(compareCandidates)[0].id, states, pool: "degraded" };
  return { chosen: null, states, pool: "none" };
}

// Back-compat convenience.
export function selectBestVendor(candidates: RoutingCandidate[]): string | null {
  return routeVendor(candidates).chosen;
}
