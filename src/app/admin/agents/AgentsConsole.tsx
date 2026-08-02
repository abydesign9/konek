"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Grid, PageHeader } from "@/components/adminUi";

interface Agent {
  id: string;
  tier: string;
  commission_rate: string;
  status: string;
  created_at: string;
  approved_at: string | null;
  phone: string | null;
  email: string | null;
  full_name: string | null;
  float_minor: string;
  unpaid_minor: string;
  paid_minor: string;
  sales: string;
  mtd_minor: string;
}

const TIERS = ["bronze", "silver", "gold"];

function naira(minor: number) {
  return `₦${(minor / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

const STATUS_CLASS: Record<string, string> = {
  active: "bg-konek-green/10 text-konek-green",
  pending: "bg-gold/15 text-gold",
  suspended: "bg-red-50 text-red-600",
  rejected: "bg-red-50 text-red-600",
  closed: "bg-slate-100 text-slate-500",
};

export function AgentsConsole() {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/agents")
      .then((r) => r.json())
      .then((d) => setAgents(d.agents ?? []))
      .catch(() => setAgents([]));
  }
  useEffect(load, []);

  async function patch(id: string, body: Record<string, unknown>, note: string) {
    setBusyId(id);
    setMessage(null);
    const res = await fetch(`/api/admin/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusyId(null);
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? note : data.error ?? "Update failed");
    if (res.ok) load();
  }

  async function payCommissions(a: Agent) {
    if (!confirm(`Pay ${naira(Number(a.unpaid_minor))} of commission to this agent's wallet?`)) return;
    setBusyId(a.id);
    setMessage(null);
    const res = await fetch(`/api/admin/agents/${a.id}/pay-commissions`, { method: "POST" });
    setBusyId(null);
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? `Paid ${naira(Number(data.paidMinor ?? 0))}.` : data.error ?? "Payout failed");
    if (res.ok) load();
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (agents ?? []).filter(
      (a) =>
        (status === "all" || a.status === status) &&
        (!q ||
          (a.full_name ?? "").toLowerCase().includes(q) ||
          (a.email ?? "").toLowerCase().includes(q) ||
          (a.phone ?? "").includes(q))
    );
  }, [agents, status, search]);

  const totals = useMemo(() => {
    const list = agents ?? [];
    return {
      total: list.length,
      pending: list.filter((a) => a.status === "pending").length,
      active: list.filter((a) => a.status === "active").length,
      unpaid: list.reduce((s, a) => s + Number(a.unpaid_minor), 0),
      float: list.reduce((s, a) => s + Number(a.float_minor), 0),
    };
  }, [agents]);

  return (
    <>
      <PageHeader
        title="Agents"
        description="Approve applications, set tier and commission rate, and pay out earned commission. Agents sell Konek services from their own wallet and earn a rebate on every delivered sale."
      />

      <Grid>
        <div className="col-span-1 lg:col-span-12">
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              { label: "Agents", value: String(totals.total) },
              { label: "Pending approval", value: String(totals.pending), tone: totals.pending ? "text-gold" : "" },
              { label: "Active", value: String(totals.active), tone: "text-konek-green" },
              { label: "Unpaid commission", value: naira(totals.unpaid), tone: totals.unpaid ? "text-gold" : "" },
              { label: "Total float", value: naira(totals.float) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border-soft bg-white p-3">
                <p className="text-xs text-text-secondary">{s.label}</p>
                <p className={`mt-1 font-heading text-lg font-bold ${s.tone || "text-indigo"}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <Card
            title="Agent roster"
            action={
              <div className="flex items-center gap-2">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-lg border border-border-soft px-2 py-1.5 text-xs"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, phone…"
                  className="w-48 rounded-lg border border-border-soft px-3 py-1.5 text-xs"
                />
              </div>
            }
          >
            {message && <p className="mb-3 text-xs font-semibold text-konek-green">{message}</p>}

            {agents === null ? (
              <p className="text-sm text-text-secondary">Loading…</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-border-soft text-xs uppercase tracking-wide text-text-secondary">
                    <tr>
                      <th className="py-2 pr-3">Agent</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Tier</th>
                      <th className="py-2 pr-3">Rate</th>
                      <th className="py-2 pr-3 text-right">Sales</th>
                      <th className="py-2 pr-3 text-right">MTD</th>
                      <th className="py-2 pr-3 text-right">Float</th>
                      <th className="py-2 pr-3 text-right">Unpaid</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((a) => {
                      const unpaid = Number(a.unpaid_minor);
                      return (
                        <tr key={a.id} className="border-b border-border-soft">
                          <td className="py-2 pr-3">
                            <p className="font-medium text-indigo">{a.full_name ?? "—"}</p>
                            <p className="text-[11px] text-text-secondary">{a.email ?? a.phone ?? a.id.slice(0, 8)}</p>
                          </td>
                          <td className="py-2 pr-3">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[a.status] ?? ""}`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="py-2 pr-3">
                            <select
                              value={a.tier}
                              disabled={busyId === a.id}
                              onChange={(e) => patch(a.id, { tier: e.target.value }, "Tier updated.")}
                              className="rounded-lg border border-border-soft px-2 py-1 text-xs capitalize"
                            >
                              {TIERS.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 pr-3">
                            <div className="flex items-center gap-1">
                              <input
                                defaultValue={(Number(a.commission_rate) * 100).toFixed(1)}
                                disabled={busyId === a.id}
                                onBlur={(e) => {
                                  const pct = Number(e.target.value);
                                  if (!Number.isFinite(pct)) return;
                                  const rate = pct / 100;
                                  if (Math.abs(rate - Number(a.commission_rate)) < 1e-9) return;
                                  patch(a.id, { commissionRate: rate }, "Commission rate updated.");
                                }}
                                className="w-14 rounded-lg border border-border-soft px-2 py-1 text-right text-xs tabular-nums"
                              />
                              <span className="text-xs text-text-secondary">%</span>
                            </div>
                          </td>
                          <td className="py-2 pr-3 text-right text-xs tabular-nums">{a.sales}</td>
                          <td className="py-2 pr-3 text-right text-xs tabular-nums">{naira(Number(a.mtd_minor))}</td>
                          <td className="py-2 pr-3 text-right text-xs tabular-nums">{naira(Number(a.float_minor))}</td>
                          <td className={`py-2 pr-3 text-right text-xs tabular-nums ${unpaid ? "font-semibold text-gold" : ""}`}>
                            {naira(unpaid)}
                          </td>
                          <td className="py-2">
                            <div className="flex flex-wrap gap-1.5">
                              {a.status !== "active" && (
                                <button
                                  onClick={() => patch(a.id, { status: "active" }, "Agent approved.")}
                                  disabled={busyId === a.id}
                                  className="rounded-lg bg-konek-green px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                                >
                                  {a.status === "pending" ? "Approve" : "Reinstate"}
                                </button>
                              )}
                              {a.status === "active" && (
                                <button
                                  onClick={() => patch(a.id, { status: "suspended" }, "Agent suspended.")}
                                  disabled={busyId === a.id}
                                  className="rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 disabled:opacity-50"
                                >
                                  Suspend
                                </button>
                              )}
                              {a.status === "pending" && (
                                <button
                                  onClick={() => patch(a.id, { status: "rejected" }, "Application rejected.")}
                                  disabled={busyId === a.id}
                                  className="rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              )}
                              <button
                                onClick={() => payCommissions(a)}
                                disabled={busyId === a.id || unpaid <= 0}
                                className="rounded-lg bg-indigo px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-40"
                              >
                                Pay
                              </button>
                              {a.status !== "closed" && (
                                <button
                                  onClick={() => {
                                    if (confirm("Remove this agent? Their history is kept but they can no longer sell.")) {
                                      patch(a.id, { status: "closed" }, "Agent removed.");
                                    }
                                  }}
                                  disabled={busyId === a.id}
                                  className="rounded-lg border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-600 disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {visible.length === 0 && <p className="py-6 text-center text-sm text-text-secondary">No agents match these filters.</p>}
              </div>
            )}
          </Card>
        </div>
      </Grid>
    </>
  );
}
