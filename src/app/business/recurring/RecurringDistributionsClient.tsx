"use client";

import { useEffect, useState } from "react";
import { BusinessShell } from "@/components/BusinessShell";

const VALID_NETWORKS = ["mtn", "glo", "airtel", "9mobile"];
const INTERVALS = [
  { days: 7, label: "Every Friday" },
  { days: 30, label: "Every 1st" },
];

interface Schedule {
  id: string;
  purpose: string;
  service_type: string;
  amount_minor_per_recipient: string;
  recipients: { phone: string; network: string }[];
  interval_days: number;
  next_run_at: string;
  last_run_at: string | null;
  last_status: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  delivered: "Delivered",
  partial: "Partially delivered",
  failed: "Failed",
  skipped_kyb: "Skipped — KYB not verified",
};

export function RecurringDistributionsClient() {
  const [businessName, setBusinessName] = useState<string | undefined>();
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [benefitName, setBenefitName] = useState("");
  const [serviceType, setServiceType] = useState<"airtime" | "data">("airtime");
  const [amountMinor, setAmountMinor] = useState("");
  const [csv, setCsv] = useState("");
  const [intervalDays, setIntervalDays] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pausing, setPausing] = useState<string | null>(null);

  function load() {
    fetch("/api/business/me")
      .then((r) => r.json())
      .then((d) => setBusinessName(d.business?.legal_name));
    fetch("/api/business/recurring-distributions")
      .then((r) => r.json())
      .then((d) => setSchedules(d.schedules ?? []));
  }
  useEffect(load, []);

  function openNew() {
    setBenefitName("");
    setServiceType("airtime");
    setAmountMinor("");
    setCsv("");
    setIntervalDays(30);
    setError(null);
    setShowForm(true);
  }

  function duplicate(s: Schedule) {
    setBenefitName(`${s.purpose} (copy)`);
    setServiceType(s.service_type === "data" ? "data" : "airtime");
    setAmountMinor(String(Number(s.amount_minor_per_recipient) / 100));
    setCsv(s.recipients.map((r) => `${r.network},${r.phone}`).join("\n"));
    setIntervalDays(s.interval_days);
    setError(null);
    setShowForm(true);
  }

  async function create() {
    const amount = Number(amountMinor) * 100;
    const recipients = csv
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [network, phone] = line.split(",").map((s) => s.trim());
        return { network, phone };
      });

    if (!benefitName.trim()) return setError("Benefit name is required");
    if (!Number.isInteger(amount) || amount <= 0) return setError("Enter a valid amount per recipient");
    if (recipients.length === 0) return setError("Add at least one recipient");
    for (const r of recipients) {
      if (!VALID_NETWORKS.includes(r.network) || !r.phone || r.phone.length < 10) {
        return setError("Each line must be network,phone — e.g. mtn,08012345678");
      }
    }

    setError(null);
    setSaving(true);
    const res = await fetch("/api/business/recurring-distributions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: benefitName, serviceType, amountMinorPerRecipient: amount, recipients, intervalDays }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not create benefit");
      return;
    }
    setShowForm(false);
    load();
  }

  async function pause(id: string) {
    setPausing(id);
    await fetch(`/api/business/recurring-distributions/${id}`, { method: "DELETE" });
    setPausing(null);
    load();
  }

  return (
    <BusinessShell businessName={businessName}>
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-indigo">Recurring Benefits</h1>
            <p className="mt-1 text-sm text-text-secondary">Automatic weekly or monthly benefits — set once, runs itself.</p>
          </div>
          {!showForm && (
            <button onClick={openNew} className="rounded-lg bg-indigo px-4 py-2 text-sm font-semibold text-white hover:bg-indigo/90">
              New Recurring Benefit
            </button>
          )}
        </div>

        {showForm && (
          <div className="raviion-card-shadow mt-5 flex flex-col gap-3 rounded-2xl bg-white p-5">
            <p className="mb-1 font-heading text-sm font-bold text-indigo">New recurring benefit</p>
            <input
              value={benefitName}
              onChange={(e) => setBenefitName(e.target.value)}
              placeholder="Benefit name (e.g. Monthly Data)"
              className="w-full rounded-xl border border-border-soft px-4 py-2.5 text-sm"
            />
            <div className="flex gap-2">
              {(["airtime", "data"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setServiceType(t)}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold capitalize ${
                    serviceType === t ? "bg-indigo text-white" : "bg-hover-tint text-indigo/60"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              value={amountMinor}
              onChange={(e) => setAmountMinor(e.target.value)}
              placeholder="Amount per employee (₦)"
              type="number"
              className="w-full rounded-xl border border-border-soft px-4 py-2.5 text-sm"
            />
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-secondary">Employees — one per line: network,phone</label>
              <textarea
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                rows={4}
                placeholder="mtn,08012345678"
                className="w-full rounded-xl border border-border-soft px-4 py-2.5 text-sm font-mono"
              />
            </div>
            <div className="flex gap-2">
              {INTERVALS.map((i) => (
                <button
                  key={i.days}
                  onClick={() => setIntervalDays(i.days)}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold ${
                    intervalDays === i.days ? "bg-indigo text-white" : "bg-hover-tint text-indigo/60"
                  }`}
                >
                  {i.label}
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button onClick={create} disabled={saving} className="flex-1 rounded-xl bg-indigo px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? "Saving…" : "Create Recurring Benefit"}
              </button>
              <button onClick={() => setShowForm(false)} className="text-sm text-text-secondary">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {schedules === null && <p className="text-sm text-text-secondary">Loading…</p>}
          {schedules?.length === 0 && !showForm && (
            <p className="raviion-card-shadow rounded-2xl bg-white px-5 py-10 text-center text-sm text-text-secondary">
              No recurring benefits yet. Set one up and it runs on its own from here on.
            </p>
          )}
          {schedules?.map((s) => (
            <div key={s.id} className="raviion-card-shadow rounded-2xl bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-heading text-base font-bold text-indigo">{s.purpose}</p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {s.interval_days === 7 ? "Every Friday" : "Every 1st"} · {s.recipients.length} Employees · ₦
                    {(Number(s.amount_minor_per_recipient) / 100).toLocaleString()}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-raviion-green/15 px-3 py-1 text-xs font-semibold text-raviion-green">Running</span>
              </div>
              <p className="mt-2 text-xs text-text-secondary">
                Next {new Date(s.next_run_at).toLocaleDateString()}
                {s.last_status && ` · Last run: ${STATUS_LABEL[s.last_status] ?? s.last_status}`}
              </p>
              <div className="mt-4 flex items-center gap-4 border-t border-border-soft pt-3">
                <button onClick={() => pause(s.id)} disabled={pausing === s.id} className="text-xs font-semibold text-indigo hover:underline disabled:opacity-50">
                  {pausing === s.id ? "…" : "Pause"}
                </button>
                <button onClick={() => duplicate(s)} className="text-xs font-semibold text-indigo hover:underline">
                  Duplicate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BusinessShell>
  );
}
