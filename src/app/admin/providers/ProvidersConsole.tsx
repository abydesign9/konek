"use client";

import { useEffect, useState } from "react";
import { Badge, Card, EmptyState, Grid, PageHeader, StatCard } from "@/components/adminUi";

interface VendorMonitoringRow {
  id: string;
  kind: string;
  priority: number;
  healthy: boolean;
  last_health_check: string | null;
  last_health_latency_ms: number | null;
  txn_count_24h: number;
  delivered_count_24h: number;
  failed_count_24h: number;
  success_rate_pct_24h: number | null;
}

interface HealthCheckEvent {
  vendor: string;
  healthy: boolean;
  latencyMs: number | null;
  createdAt: string;
}

// Status is derived from real signals, not just the raw `healthy` flag:
// unhealthy is always "down"; healthy but a poor recent success rate (or a
// slow last check) is "degraded" rather than a flat green — an ops team
// needs to see trouble before the failover flag flips.
type Status = "healthy" | "degraded" | "down";

function deriveStatus(v: VendorMonitoringRow): Status {
  if (!v.healthy) return "down";
  if (v.success_rate_pct_24h !== null && v.success_rate_pct_24h < 90) return "degraded";
  if (v.last_health_latency_ms !== null && v.last_health_latency_ms > 2000) return "degraded";
  return "healthy";
}

const STATUS_DOT: Record<Status, string> = {
  healthy: "bg-konek-green",
  degraded: "bg-gold",
  down: "bg-red-500",
};
const STATUS_LABEL: Record<Status, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  down: "Down",
};
const STATUS_BADGE_TONE: Record<Status, "green" | "gold" | "red"> = {
  healthy: "green",
  degraded: "gold",
  down: "red",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function ProvidersConsole() {
  const [vendors, setVendors] = useState<VendorMonitoringRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [history, setHistory] = useState<HealthCheckEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function loadVendors() {
    fetch("/api/admin/vendors/monitoring")
      .then((r) => r.json())
      .then((d) => setVendors(d.vendors ?? []));
  }

  useEffect(loadVendors, []);

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
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
    if (!res.ok) {
      setMessage(body.error ?? "Failed to run health check");
      return;
    }
    setMessage("Health check complete");
    loadVendors();
    if (expandedId) toggleExpand(expandedId);
  }

  async function toggleHealthy(v: VendorMonitoringRow) {
    setTogglingId(v.id);
    const res = await fetch(`/api/admin/vendors/${v.id}/health`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ healthy: !v.healthy }),
    });
    setTogglingId(null);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) setMessage(body.error ?? "Failed to update vendor");
    loadVendors();
  }

  const overallHealthy = vendors.filter((v) => deriveStatus(v) === "healthy").length;
  const overallDown = vendors.filter((v) => deriveStatus(v) === "down").length;

  return (
    <>
      <PageHeader
        title="Providers"
        description="Vendor adapter health, routing priority, and 24h delivery success — the failover an outage triggers actually reads these same rows."
      />

      <Grid className="mb-8">
        <div className="col-span-1 lg:col-span-3">
          <StatCard label="Providers" value={vendors.length} />
        </div>
        <div className="col-span-1 lg:col-span-3">
          <StatCard label="Healthy" value={overallHealthy} tone="green" />
        </div>
        <div className="col-span-1 lg:col-span-3">
          <StatCard label="Down" value={overallDown} tone={overallDown > 0 ? "red" : "indigo"} />
        </div>
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
          </div>
        </div>
      </Grid>

      <Card title="Vendor adapters">
        {vendors.length === 0 ? (
          <EmptyState message="No vendors configured." />
        ) : (
          <div className="flex flex-col gap-3">
            {vendors.map((v) => {
              const status = deriveStatus(v);
              return (
                <div key={v.id} className="rounded-xl border border-border-soft">
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[status]}`} />
                      <div>
                        <p className="text-sm font-medium text-indigo">
                          {v.id} <span className="text-text-secondary">· {v.kind} · priority {v.priority}</span>
                        </p>
                        <p className="text-xs text-text-secondary">
                          last checked {timeAgo(v.last_health_check)}
                          {v.last_health_latency_ms !== null && ` · ${v.last_health_latency_ms}ms`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-indigo">
                          {v.success_rate_pct_24h === null ? "—" : `${v.success_rate_pct_24h}%`}
                        </p>
                        <p className="text-[11px] text-text-secondary">
                          {v.txn_count_24h === 0 ? "no txns (24h)" : `${v.delivered_count_24h}/${v.txn_count_24h} delivered (24h)`}
                        </p>
                      </div>
                      <Badge tone={STATUS_BADGE_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                      <button
                        onClick={() => toggleHealthy(v)}
                        disabled={togglingId === v.id}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                          v.healthy ? "bg-red-50 text-red-600" : "bg-konek-green/10 text-konek-green"
                        }`}
                      >
                        {v.healthy ? "Mark unhealthy" : "Mark healthy"}
                      </button>
                      <button onClick={() => toggleExpand(v.id)} className="text-xs font-semibold text-indigo underline">
                        {expandedId === v.id ? "Hide history" : "View history"}
                      </button>
                    </div>
                  </div>

                  {expandedId === v.id && (
                    <div className="border-t border-border-soft bg-hover-tint px-4 py-3">
                      {history.length === 0 ? (
                        <p className="text-xs text-text-secondary">No health check history yet.</p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {history.map((h, i) => (
                            <p key={i} className="text-xs text-text-secondary">
                              <span className={h.healthy ? "text-konek-green" : "text-red-600"}>
                                {h.healthy ? "healthy" : "unhealthy"}
                              </span>{" "}
                              · {h.latencyMs !== null ? `${h.latencyMs}ms` : "—"} · {new Date(h.createdAt).toLocaleString()}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}
