import { recordProviderCall, ProviderOperation } from "@/lib/vendors/providerMetrics";

// ============================================================================
// Shared HTTP resilience layer. EVERY external provider integration must call
// providers through this — timeout, bounded retry with backoff, a per-provider
// circuit breaker, and per-call metrics — so no provider-specific resilience
// logic leaks into adapters or the business layer.
// ============================================================================

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_STATUSES = [429, 500, 502, 503, 504];
const BREAKER_THRESHOLD = 5; // consecutive failures before opening
const BREAKER_COOLDOWN_MS = 30_000;

export class ProviderTimeoutError extends Error {
  constructor(provider: string, timeoutMs: number) {
    super(`Provider ${provider} timed out after ${timeoutMs}ms`);
    this.name = "ProviderTimeoutError";
  }
}
export class ProviderHttpError extends Error {
  constructor(public readonly provider: string, public readonly status: number, public readonly body: string) {
    super(`Provider ${provider} returned HTTP ${status}`);
    this.name = "ProviderHttpError";
  }
}
export class ProviderNetworkError extends Error {
  constructor(provider: string, detail: string) {
    super(`Provider ${provider} network error: ${detail}`);
    this.name = "ProviderNetworkError";
  }
}
export class CircuitOpenError extends Error {
  constructor(provider: string) {
    super(`Circuit breaker open for provider ${provider} — failing fast`);
    this.name = "CircuitOpenError";
  }
}

// --- Per-provider circuit breaker (in-process). On serverless each instance
// keeps its own breaker, which is fine: a broken provider trips fast locally,
// and cross-instance health lives in provider_metrics / vendors.healthy. ---
interface BreakerState {
  failures: number;
  openUntil: number; // epoch ms; 0 = closed
}
const breakers = new Map<string, BreakerState>();

// Test hook — reset breaker state between cases.
export function __resetCircuitBreakers(): void {
  breakers.clear();
}

// Whether a provider's breaker is currently open (used by routing to surface
// circuit_open state and steer traffic away).
export function isCircuitOpen(provider: string): boolean {
  const b = breakers.get(provider);
  return !!b && b.openUntil > Date.now();
}

function breakerAllows(provider: string): boolean {
  const b = breakers.get(provider);
  if (!b) return true;
  // Open and still cooling down → fail fast. Past cooldown → half-open trial.
  return b.openUntil <= Date.now();
}
function noteSuccess(provider: string): void {
  breakers.set(provider, { failures: 0, openUntil: 0 });
}
function noteFailure(provider: string): void {
  const b = breakers.get(provider) ?? { failures: 0, openUntil: 0 };
  b.failures += 1;
  if (b.failures >= BREAKER_THRESHOLD) {
    b.openUntil = Date.now() + BREAKER_COOLDOWN_MS;
    b.failures = 0;
  }
  breakers.set(provider, b);
}

export interface ResilientOptions {
  provider: string;
  operation: ProviderOperation;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  retries?: number;
  retryOnStatuses?: number[];
  fetchImpl?: typeof fetch; // injectable for tests
}

export interface ResilientResponse {
  status: number;
  ok: boolean;
  body: string;
  json<T = unknown>(): T;
}

interface AttemptResult {
  errorKind?: "timeout" | "network";
  message?: string;
  status?: number;
  ok?: boolean;
  text?: string;
}

async function backoff(attempt: number): Promise<void> {
  const base = 200 * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 100);
  await new Promise((r) => setTimeout(r, base + jitter));
}

export async function resilientRequest(opts: ResilientOptions): Promise<ResilientResponse> {
  const { provider, operation, url } = opts;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = opts.retries ?? DEFAULT_RETRIES;
  const retryStatuses = opts.retryOnStatuses ?? DEFAULT_RETRY_STATUSES;
  const doFetch = opts.fetchImpl ?? fetch;

  if (!breakerAllows(provider)) {
    await recordProviderCall({ provider, operation, outcome: "circuit_open" });
    throw new CircuitOpenError(provider);
  }

  async function attempt(): Promise<AttemptResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await doFetch(url, {
        method: opts.method ?? "GET",
        headers: opts.headers,
        body: opts.body,
        signal: controller.signal,
      });
      const text = await res.text();
      return { status: res.status, ok: res.ok, text };
    } catch (err) {
      const name = (err as { name?: string })?.name;
      return { errorKind: name === "AbortError" ? "timeout" : "network", message: (err as Error)?.message };
    } finally {
      clearTimeout(timer);
    }
  }

  for (let i = 0; i <= retries; i++) {
    const started = Date.now();
    const r = await attempt();
    const latency = Date.now() - started;

    if (r.errorKind) {
      const outcome = r.errorKind === "timeout" ? "timeout" : "failure";
      await recordProviderCall({ provider, operation, outcome, latencyMs: latency, error: r.message });
      noteFailure(provider);
      if (i < retries) {
        await backoff(i);
        continue;
      }
      if (r.errorKind === "timeout") throw new ProviderTimeoutError(provider, timeoutMs);
      throw new ProviderNetworkError(provider, r.message ?? "unknown");
    }

    if (r.ok) {
      await recordProviderCall({ provider, operation, outcome: "success", latencyMs: latency, httpStatus: r.status });
      noteSuccess(provider);
      const text = r.text ?? "";
      return { status: r.status!, ok: true, body: text, json: <T>() => JSON.parse(text) as T };
    }

    // Non-OK HTTP status.
    await recordProviderCall({ provider, operation, outcome: "failure", latencyMs: latency, httpStatus: r.status });
    noteFailure(provider);
    if (retryStatuses.includes(r.status!) && i < retries) {
      await backoff(i);
      continue;
    }
    throw new ProviderHttpError(provider, r.status!, r.text ?? "");
  }

  // Unreachable, but keeps the type checker happy.
  throw new ProviderNetworkError(provider, "exhausted retries");
}
