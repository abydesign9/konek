"use client";

import { useEffect, useState } from "react";
import { Card, Grid, PageHeader, Badge } from "@/components/adminUi";

interface Config {
  cardCreationFeeMinorNGN: number;
  cardCreationFeeMinorUSD: number;
  nairaAccountKycTier: number;
  dollarAccountKycTier: number;
}
interface Limit {
  kyc_tier: number;
  metric: string;
  currency: string;
  max_minor: string;
}
interface Provider {
  service: string;
  provider: string;
  live: boolean;
}
interface Stats {
  nairaAccounts: number;
  usdAccounts: number;
  totalInflowMinor: number;
  activeCards: number;
  cardSpendMinor: number;
  promoPaidMinor: number;
  users: number;
}

type Tab = "overview" | "limits" | "fees" | "providers";

export function FinancialConfigConsole() {
  const [tab, setTab] = useState<Tab>("overview");
  const [config, setConfig] = useState<Config | null>(null);
  const [limits, setLimits] = useState<Limit[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/financial-config")
      .then((r) => r.json())
      .then((d) => {
        setConfig(d.config);
        setLimits(d.limits ?? []);
        setProviders(d.providers ?? []);
        setStats(d.stats ?? null);
      });
  }
  useEffect(load, []);

  async function saveConfig(patch: Partial<Config>) {
    const res = await fetch("/api/admin/financial-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Saved." : d.error ?? "Failed");
    if (res.ok) setConfig(d.config);
  }

  async function saveLimit(l: Limit, maxMinor: number) {
    const res = await fetch("/api/admin/financial-config/limits", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kycTier: l.kyc_tier, metric: l.metric, currency: l.currency, maxMinor }),
    });
    setMsg(res.ok ? "Limit saved." : "Save failed.");
    if (res.ok) load();
  }

  const money = (m: number | string, ccy = "NGN") => `${ccy === "USD" ? "$" : "₦"}${(Number(m) / 100).toLocaleString()}`;

  return (
    <>
      <PageHeader
        title="Financial configuration"
        description="Tune the settings the live code actually reads: transaction limits (enforced by the spend checks), fees, account rules, and card controls. Provider API keys are managed in environment variables, never here — this panel only shows which providers are live."
      />
      {msg && <p className="mb-3 text-sm font-semibold text-raviion-green">{msg}</p>}

      <div className="mb-5 flex gap-2">
        {(["overview", "limits", "fees", "providers"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${tab === t ? "bg-indigo text-white" : "bg-indigo/10 text-indigo/70"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Naira accounts", value: stats.nairaAccounts.toLocaleString() },
            { label: "USD accounts", value: stats.usdAccounts.toLocaleString() },
            { label: "Total inflow", value: money(stats.totalInflowMinor) },
            { label: "Active cards", value: stats.activeCards.toLocaleString() },
            { label: "Card spend", value: money(stats.cardSpendMinor, "USD") },
            { label: "Promo paid out", value: money(stats.promoPaidMinor) },
            { label: "Customers", value: stats.users.toLocaleString() },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border-soft bg-white p-4">
              <p className="text-xs text-text-secondary">{s.label}</p>
              <p className="mt-1 font-heading text-xl font-bold text-indigo">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "limits" && (
        <Card title="Transaction limits (read live by the spend checks)">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border-soft text-xs uppercase text-text-secondary">
                <tr><th className="py-2 pr-3">Tier</th><th className="py-2 pr-3">Metric</th><th className="py-2 pr-3">Currency</th><th className="py-2 text-right">Max</th></tr>
              </thead>
              <tbody>
                {limits.map((l) => (
                  <tr key={`${l.currency}-${l.kyc_tier}-${l.metric}`} className="border-b border-border-soft">
                    <td className="py-2 pr-3">{l.kyc_tier}</td>
                    <td className="py-2 pr-3 text-xs">{l.metric.replace(/_/g, " ")}</td>
                    <td className="py-2 pr-3">{l.currency}</td>
                    <td className="py-2 text-right">
                      <input
                        defaultValue={(Number(l.max_minor) / 100).toString()}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isFinite(v) && v >= 0) saveLimit(l, Math.round(v * 100));
                        }}
                        className="w-32 rounded-lg border border-border-soft px-2 py-1 text-right text-xs tabular-nums"
                      />
                    </td>
                  </tr>
                ))}
                {limits.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-sm text-text-secondary">No limits configured.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-text-secondary">Amounts are in major units (naira / dollars). Editing a cell saves on blur and takes effect immediately.</p>
        </Card>
      )}

      {tab === "fees" && config && (
        <Grid>
          <div className="col-span-1 lg:col-span-6">
            <Card title="Fees">
              <FeeRow label="Card creation fee (NGN)" valueMinor={config.cardCreationFeeMinorNGN} onSave={(m) => saveConfig({ cardCreationFeeMinorNGN: m })} />
              <FeeRow label="Card creation fee (USD)" valueMinor={config.cardCreationFeeMinorUSD} usd onSave={(m) => saveConfig({ cardCreationFeeMinorUSD: m })} />
            </Card>
          </div>
          <div className="col-span-1 lg:col-span-6">
            <Card title="Account rules">
              <TierRow label="Min KYC tier for Naira account" value={config.nairaAccountKycTier} onSave={(t) => saveConfig({ nairaAccountKycTier: t })} />
              <TierRow label="Min KYC tier for USD account" value={config.dollarAccountKycTier} onSave={(t) => saveConfig({ dollarAccountKycTier: t })} />
            </Card>
          </div>
        </Grid>
      )}

      {tab === "providers" && (
        <Card title="Provider status (keys managed in environment variables)">
          <div className="space-y-2">
            {providers.map((p) => (
              <div key={p.service} className="flex items-center justify-between rounded-xl border border-border-soft p-3">
                <div>
                  <p className="text-sm font-semibold text-indigo">{p.service}</p>
                  <p className="text-xs text-text-secondary">{p.provider}</p>
                </div>
                <Badge tone={p.live ? "green" : "gold"}>{p.live ? "live" : "mock / not set"}</Badge>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-text-secondary">To switch a provider live, set its keys in the deployment environment. Never store API keys in the database.</p>
        </Card>
      )}
    </>
  );
}

function FeeRow({ label, valueMinor, usd, onSave }: { label: string; valueMinor: number; usd?: boolean; onSave: (m: number) => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border-soft py-2.5 last:border-0">
      <span className="text-sm text-indigo">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-text-secondary">{usd ? "$" : "₦"}</span>
        <input
          defaultValue={(valueMinor / 100).toString()}
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v >= 0) onSave(Math.round(v * 100));
          }}
          className="w-24 rounded-lg border border-border-soft px-2 py-1 text-right text-xs tabular-nums"
        />
      </div>
    </div>
  );
}

function TierRow({ label, value, onSave }: { label: string; value: number; onSave: (t: number) => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border-soft py-2.5 last:border-0">
      <span className="text-sm text-indigo">{label}</span>
      <select value={value} onChange={(e) => onSave(Number(e.target.value))} className="rounded-lg border border-border-soft px-2 py-1 text-xs">
        <option value={0}>0 · Browse</option>
        <option value={1}>1 · Transact (BVN/NIN)</option>
        <option value={2}>2 · Finance (ID + liveness)</option>
      </select>
    </div>
  );
}
