"use client";

import { useEffect, useState } from "react";
import { Card, Grid, PageHeader } from "@/components/adminUi";

interface Program {
  enabled: boolean;
  affiliateCommissionPct: number;
  waiveCardCreationFee: boolean;
  feeDiscountPct: number;
  limitMultiplier: number;
  prioritySupport: boolean;
}
interface Stats {
  activeAgents: number;
  unpaidMinor: number;
  paidMinor: number;
}

export function AgentProgramConsole() {
  const [program, setProgram] = useState<Program | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/agent-program")
      .then((r) => r.json())
      .then((d) => {
        setProgram(d.program);
        setStats(d.stats ?? null);
      });
  }
  useEffect(load, []);

  async function save(patch: Partial<Program>) {
    const res = await fetch("/api/admin/agent-program", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Saved." : d.error ?? "Failed");
    if (res.ok) setProgram(d.program);
  }

  if (!program) return null;
  const naira = (m: number) => `₦${(m / 100).toLocaleString()}`;

  return (
    <>
      <PageHeader
        title="Agent program"
        description="Affiliates, campus ambassadors and marketing partners refer customers and earn commission on those customers' purchases across the whole catalogue, with fee and limit perks. Every setting here is live and can be switched off — nothing is hardcoded."
      />
      {msg && <p className="mb-3 text-sm font-semibold text-raviion-green">{msg}</p>}

      {stats && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: "Active agents", value: stats.activeAgents.toLocaleString() },
            { label: "Unpaid commission", value: naira(stats.unpaidMinor) },
            { label: "Paid commission", value: naira(stats.paidMinor) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border-soft bg-white p-4">
              <p className="text-xs text-text-secondary">{s.label}</p>
              <p className="mt-1 font-heading text-xl font-bold text-indigo">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <Grid>
        <div className="col-span-1 lg:col-span-6">
          <Card title="Program">
            <Toggle label="Program enabled" hint="Master switch — turn the whole programme on or off" checked={program.enabled} onChange={(v) => save({ enabled: v })} />
            <NumRow label="Affiliate commission %" hint="Agents earn this on their referred customers' purchases" value={program.affiliateCommissionPct} onSave={(v) => save({ affiliateCommissionPct: v })} />
            <NumRow label="Limit multiplier" hint="Agents get this multiple of the normal transaction limits" value={program.limitMultiplier} onSave={(v) => save({ limitMultiplier: v })} />
          </Card>
        </div>
        <div className="col-span-1 lg:col-span-6">
          <Card title="Agent perks">
            <Toggle label="Waive card creation fee" checked={program.waiveCardCreationFee} onChange={(v) => save({ waiveCardCreationFee: v })} />
            <NumRow label="Fee discount % (if not waived)" hint="Discount on fees agents pay" value={program.feeDiscountPct} onSave={(v) => save({ feeDiscountPct: v })} />
            <Toggle label="Priority support" hint="Flag agents for priority support routing" checked={program.prioritySupport} onChange={(v) => save({ prioritySupport: v })} />
          </Card>
        </div>
      </Grid>

      <p className="mt-4 text-xs text-text-secondary">
        Individual agents (approve, per-agent commission rate, pay commissions) are managed under Agents.
      </p>
    </>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between border-b border-border-soft py-3 last:border-0">
      <span>
        <span className="block text-sm text-indigo">{label}</span>
        {hint && <span className="block text-xs text-text-secondary">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function NumRow({ label, hint, value, onSave }: { label: string; hint?: string; value: number; onSave: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border-soft py-3 last:border-0">
      <span>
        <span className="block text-sm text-indigo">{label}</span>
        {hint && <span className="block text-xs text-text-secondary">{hint}</span>}
      </span>
      <input
        defaultValue={String(value)}
        onBlur={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v) && v >= 0) onSave(v);
        }}
        className="w-20 rounded-lg border border-border-soft px-2 py-1.5 text-right text-xs tabular-nums"
      />
    </div>
  );
}
