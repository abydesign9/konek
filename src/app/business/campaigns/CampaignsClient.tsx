"use client";

import { useEffect, useState } from "react";
import { BusinessShell } from "@/components/BusinessShell";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  budget_minor: string | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  spent_minor: string;
  batch_count: string;
}

function naira(minor: number | string | null) {
  if (minor == null) return "—";
  return `₦${(Number(minor) / 100).toLocaleString()}`;
}

const STATUS_TONE: Record<string, string> = {
  active: "bg-konek-green/10 text-konek-green",
  completed: "bg-indigo/10 text-indigo",
  archived: "bg-slate-100 text-slate-500",
};

export function CampaignsClient() {
  const [businessName, setBusinessName] = useState<string | undefined>();
  const [role, setRole] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/business/me").then((r) => r.json()).then((d) => {
      setBusinessName(d.business?.legal_name);
      setRole(d.role);
    });
    fetch("/api/business/campaigns").then((r) => r.json()).then((d) => setCampaigns(d.campaigns ?? []));
  }
  useEffect(load, []);

  const canManage = role === "owner" || role === "admin" || role === "finance" || role === "hr";

  async function createCampaign() {
    if (!name.trim()) return setError("Campaign name is required");
    setError(null);
    setBusy(true);
    const res = await fetch("/api/business/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        budgetMinor: budget ? Math.round(Number(budget) * 100) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(d.error ?? "Could not create campaign");
      return;
    }
    setShowCreate(false);
    setName("");
    setDescription("");
    setBudget("");
    setStartDate("");
    setEndDate("");
    load();
  }

  async function archive(id: string) {
    await fetch(`/api/business/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    load();
  }

  return (
    <BusinessShell businessName={businessName}>
      <div className="mx-auto max-w-4xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-indigo">Campaigns</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Group related distributions together — like &quot;Graduate Trainee Welcome&quot; or &quot;December Bonus
              Data&quot; — with a shared budget and timeline.
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setShowCreate((s) => !s)}
              className="shrink-0 rounded-xl bg-indigo px-4 py-2.5 text-sm font-semibold text-white"
            >
              + New campaign
            </button>
          )}
        </div>

        {showCreate && (
          <div className="konek-card-shadow mt-5 rounded-2xl border border-border-soft bg-white p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" className="rounded-xl border border-border-soft px-3 py-2.5 text-sm sm:col-span-2" />
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="rounded-xl border border-border-soft px-3 py-2.5 text-sm sm:col-span-2" />
              <input value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Budget in ₦ (optional)" className="rounded-xl border border-border-soft px-3 py-2.5 text-sm" inputMode="decimal" />
              <div className="flex gap-2">
                <input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" className="w-full rounded-xl border border-border-soft px-3 py-2.5 text-sm" />
                <input value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" className="w-full rounded-xl border border-border-soft px-3 py-2.5 text-sm" />
              </div>
            </div>
            <button onClick={createCampaign} disabled={busy} className="mt-3 rounded-xl bg-konek-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? "Creating…" : "Create campaign"}
            </button>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {(campaigns ?? []).map((c) => {
            const budgetMinor = c.budget_minor != null ? Number(c.budget_minor) : null;
            const spentMinor = Number(c.spent_minor);
            const pct = budgetMinor ? Math.min(100, Math.round((spentMinor / budgetMinor) * 100)) : null;
            return (
              <div key={c.id} className="konek-card-shadow rounded-2xl bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-base font-bold text-indigo">{c.name}</p>
                    {c.description && <p className="mt-0.5 text-sm text-text-secondary">{c.description}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_TONE[c.status] ?? ""}`}>{c.status}</span>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{c.batch_count} distribution{c.batch_count === "1" ? "" : "s"}</span>
                  <span className="font-semibold text-indigo">
                    {naira(c.spent_minor)}{budgetMinor != null && <> / {naira(c.budget_minor)}</>}
                  </span>
                </div>

                {pct != null && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-indigo/10">
                    <div
                      className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : "bg-konek-green"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}

                {(c.start_date || c.end_date) && (
                  <p className="mt-2 text-xs text-text-secondary">
                    {c.start_date ? new Date(c.start_date).toLocaleDateString() : "No start"} – {c.end_date ? new Date(c.end_date).toLocaleDateString() : "No end"}
                  </p>
                )}

                {canManage && c.status === "active" && (
                  <button onClick={() => archive(c.id)} className="mt-3 text-xs font-semibold text-indigo/50 hover:text-indigo">
                    Archive
                  </button>
                )}
              </div>
            );
          })}
          {campaigns !== null && campaigns.length === 0 && (
            <p className="konek-card-shadow rounded-2xl bg-white px-6 py-12 text-center text-sm text-text-secondary">
              No campaigns yet. Create one, then link distributions to it from the Distributions page.
            </p>
          )}
        </div>
      </div>
    </BusinessShell>
  );
}
