"use client";

import { useEffect, useState } from "react";
import { Badge, Card, EmptyState, Grid, PageHeader, StatCard } from "@/components/adminUi";

type ProviderState = "healthy" | "degraded" | "circuit_open" | "low_float" | "maintenance" | "disabled";

interface ProviderRow {
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
  calls: number;
  successRatePct: number | null;
  timeoutRatePct: number | null;
  failureRatePct: number | null;
  circuitOpenCount: number;
  latencyP50Ms: number | null;
  latencyP95Ms: number | null;
  txnCount24h: number;
  delivered24h: number;
  failed24h: number;
  successRate24hPct: number | null;
  chosenForKind: boolean;
  routingRank: number | null;
  routingPool: "healthy" | "degraded" | "none";
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

interface HealthCheckEvent {
  vendor: string;
  healthy: boolean;
  latencyMs: number | null;
  createdAt: string;
}

const STATE_LABEL: Record<ProviderState, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  circuit_open: "Circuit open",
  low_float: "Low float",
  maintenance: "Maintenance",
  disabled: "Disabled",
};
const STATE_TONE: Record<ProviderState, "green" | "gold" | "red" | "neutral"> = {
  healthy: "green",
  degraded: "gold",
  circuit_open: "red",
  low_float: "gold",
  maintenance: "neutral",
  disabled: "neutral",
};
const STATE_DOT: Record<ProviderState, string> = {
  healthy: "bg-konek-green",
  degraded: "bg-gold",
  circuit_open: "bg-red-500",
  low_float: "bg-gold",
  maintenance: "bg-disabled-bg",
  disabled: "bg-disabled-bg",
};

function pct(v: number | null): string {
  return v === null ? "—" : `${v}%`;
}
function ms(v: number | null): string {
  return v === null ? "—" : `${v}ms`;
}
function naira(minor: number | null): string {
  return minor === null ? "unknown" : `₦${(minor / 100).toLocaleString()}`;
}
function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "red" | "gold" }) {
  const color = tone === "red" ? "text-red-600" : tone === "gold" ? "text-gold" : "text-indigo";
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={`text-sm font-semibold ${color}`}>{value}</p>
    </div>
  );
}

export function ProvidersConsole() {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [history, setHistory] = useState<HealthCheckEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/providers/dashboard")
      .then((r) => r.json())
      .then((d) => setProviders(d.providers ?? []));
  }
  useEffect(load, []);

  function toggleExpand(id: string) {
    if (expandedId === id) return setExpandedId(null);
    setExpandedId(id);
    fetch(`/api/admin/vendors/monitoring/${id}/history`)
      .then((r) => r.json())
      .then((d) => setHistory(d.history ?? []));
  }

  async function runCheckNow() {
    setRunning(true);
    setMessage(null);
    const res = await fetch("/api/admin/vendors/monitoring/run", { method: "POST" });
    setRunning(false);
    const body = await res.json().catch(() => ({}));
    setMessage(res.ok ? "Health check complete" : body.error ?? "Failed to run health check");
    load();
  }

  async function control(
    p: ProviderRow,
    patch: { enabled?: boolean; maintenance?: boolean } | { healthy: boolean },
    url: string
  ) {
    setBusyId(p.id);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessage(body.error ?? "Action failed");
    }
    load();
  }

  const healthy = providers.filter((p) => p.state === "healthy").length;
  const trouble = providers.filter((p) => ["degraded", "circuit_open", "low_float"].includes(p.state)).length;
  const offline = providers.filter((p) => ["disabled", "maintenance"].includes(p.state)).length;

  return (
    <>
      <PageHeader
        title="Provider Operations"
        description="Live provider health, circuit state, float, latency and routing — the same signals the failover policy reads at purchase time."
      />

      <Grid className="mb-8">
        <div className="col-span-1 lg:col-span-3"><StatCard label="Providers" value={providers.length} /></div>
        <div className="col-span-1 lg:col-span-3"><StatCard label="Healthy" value={healthy} tone="green" /></div>
        <div className="col-span-1 lg:col-span-3"><StatCard label="Trouble" value={trouble} tone={trouble > 0 ? "gold" : "indigo"} /></div>
        <div className="col-span-1 lg:col-span-3">
          <div className="flex h-full flex-col justify-center rounded-2xl border border-border-soft bg-white p-5">
            <button
              onClick={runCheckNow}
              disabled={running}
              className="rounded-lg bg-indigo px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {running ? "Running…" : "Run check now"}
            </button>
            {message && <p className="mt-2 text-xs text-text-secondary">{message}</p>}
            {offline > 0 && <p className="mt-1 text-[11px] text-text-secondary">{offline} disabled/in maintenance</p>}
          </div>
        </div>
      </Grid>

      <Card title="Providers">
        {providers.length === 0 ? (
          <EmptyState message="No providers configured." />
        ) : (
          <div className="flex flex-col gap-3">
            {providers.map((p) => (
              <div key={p.id} className="rounded-xl border border-border-soft">
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATE_DOT[p.state]}`} />
                      <div>
                        <p className="text-sm font-medium text-indigo">
                          {p.id} <span className="text-text-secondary">· {p.kind} · priority {p.priority}</span>
                          {p.chosenForKind && <span className="ml-2 text-[11px] font-semibold text-konek-green">◀ routed</span>}
                        </p>
                        <p className="text-xs text-text-secondary">
                          checked {timeAgo(p.lastHealthCheck)}
                          {p.lastHealthLatencyMs !== null && ` · ${p.lastHealthLatencyMs}ms`}
                          {p.routingRank !== null && ` · routing rank #${p.routingRank}`}
                          {!p.registered && " · no adapter"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={STATE_TONE[p.state]}>{STATE_LABEL[p.state]}</Badge>
                      {p.circuitOpen && <Badge tone="red">breaker open</Badge>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                    <Metric label="Success (60m)" value={pct(p.successRatePct)} tone={p.successRatePct !== null && p.successRatePct < 90 ? "gold" : undefined} />
                    <Metric label="Failure" value={pct(p.failureRatePct)} tone={p.failureRatePct ? "red" : undefined} />
                    <Metric label="Timeout" value={pct(p.timeoutRatePct)} tone={p.timeoutRatePct ? "gold" : undefined} />
                    <Metric label="p50 / p95" value={`${ms(p.latencyP50Ms)} / ${ms(p.latencyP95Ms)}`} />
                    <Metric label="Float / min" value={`${naira(p.floatBalanceMinor)} / ${naira(p.floatThresholdMinor)}`} tone={p.state === "low_float" ? "gold" : undefined} />
                    <Metric label="Cost weight" value={p.costWeight.toString()} />
                    <Metric label="Delivered (24h)" value={p.txnCount24h === 0 ? "no txns" : `${p.delivered24h}/${p.txnCount24h} (${pct(p.successRate24hPct)})`} />
                    <Metric label="Calls (60m)" value={p.calls.toString()} />
                    <Metric label="Retries / breaker" value={`${p.webhookRetrySum} / ${p.circuitOpenCount}`} />
                    <Metric
                      label="Last sync"
                      value={p.lastSyncAt ? `${timeAgo(p.lastSyncAt)} (${p.lastSyncStatus})` : "never"}
                      tone={p.lastSyncSkippedMargin ? "gold" : undefined}
                    />
                    <Metric label="Last webhook" value={p.lastWebhookAt ? `${timeAgo(p.lastWebhookAt)} (${p.lastWebhookStatus})` : "never"} tone={p.webhookFailedCount ? "red" : undefined} />
                    <Metric label="Routing pool" value={p.routingPool} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-border-soft pt-3">
                    <button
                      onClick={() => control(p, { enabled: !p.enabled }, `/api/admin/vendors/${p.id}/control`)}
                      disabled={busyId === p.id}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${p.enabled ? "bg-red-50 text-red-600" : "bg-konek-green/10 text-konek-green"}`}
                    >
                      {p.enabled ? "Disable (kill switch)" : "Enable"}
                    </button>
                    <button
                      onClick={() => control(p, { maintenance: !p.maintenance }, `/api/admin/vendors/${p.id}/control`)}
                      disabled={busyId === p.id}
                      className="rounded-lg bg-hover-tint px-3 py-1.5 text-xs font-semibold text-indigo disabled:opacity-50"
                    >
                      {p.maintenance ? "End maintenance" : "Maintenance"}
                    </button>
                    <button
                      onClick={() => control(p, { healthy: !p.healthy }, `/api/admin/vendors/${p.id}/health`)}
                      disabled={busyId === p.id}
                      className="rounded-lg bg-hover-tint px-3 py-1.5 text-xs font-semibold text-indigo disabled:opacity-50"
                    >
                      {p.healthy ? "Mark unhealthy" : "Mark healthy"}
                    </button>
                    <button onClick={() => toggleExpand(p.id)} className="ml-auto text-xs font-semibold text-indigo underline">
                      {expandedId === p.id ? "Hide history" : "Health history"}
                    </button>
                  </div>
                </div>

                {expandedId === p.id && (
                  <div className="border-t border-border-soft bg-hover-tint px-4 py-3">
                    {history.length === 0 ? (
                      <p className="text-xs text-text-secondary">No health check history yet.</p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {history.map((h, i) => (
                          <p key={i} className="text-xs text-text-secondary">
                            <span className={h.healthy ? "text-konek-green" : "text-red-600"}>{h.healthy ? "healthy" : "unhealthy"}</span>{" "}
                            · {h.latencyMs !== null ? `${h.latencyMs}ms` : "—"} · {new Date(h.createdAt).toLocaleString()}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
