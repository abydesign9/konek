"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";

const VALID_NETWORKS = ["mtn", "glo", "airtel", "9mobile"];
const INTERVALS = [
  { days: 7, label: "Weekly" },
  { days: 30, label: "Monthly" },
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
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [serviceType, setServiceType] = useState<"airtime" | "data">("airtime");
  const [amountMinor, setAmountMinor] = useState("");
  const [csv, setCsv] = useState("");
  const [intervalDays, setIntervalDays] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  function load() {
    fetch("/api/business/recurring-distributions")
      .then((r) => r.json())
      .then((d) => setSchedules(d.schedules ?? []));
  }
  useEffect(load, []);

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

    if (!purpose.trim()) return setError("Purpose is required");
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
      body: JSON.stringify({ purpose, serviceType, amountMinorPerRecipient: amount, recipients, intervalDays }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not create schedule");
      return;
    }
    setShowForm(false);
    setPurpose("");
    setCsv("");
    setAmountMinor("");
    load();
  }

  async function cancel(id: string) {
    setCancelling(id);
    await fetch(`/api/business/recurring-distributions/${id}`, { method: "DELETE" });
    setCancelling(null);
    load();
  }

  return (
    <main className="min-h-screen bg-background pb-12">
      <PageHeader
        title="Recurring distributions"
        backHref="/business"
        right={
          !showForm && (
            <button onClick={() => setShowForm(true)} className="text-sm font-semibold text-indigo">
              New
            </button>
          )
        }
      />

      <div className="mx-auto flex max-w-lg flex-col gap-4 px-5 py-6">
        {showForm && (
          <div className="konek-card-shadow flex flex-col gap-3 rounded-2xl bg-white px-5 py-5">
            <input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Purpose (e.g. Monthly team data)"
              className="w-full rounded-xl border border-indigo/20 px-4 py-2.5 text-sm"
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
              placeholder="Amount per recipient (₦)"
              type="number"
              className="w-full rounded-xl border border-indigo/20 px-4 py-2.5 text-sm"
            />
            <div>
              <label className="mb-1 block text-xs font-semibold text-indigo/50">
                Recipients — one per line: network,phone
              </label>
              <textarea
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                rows={4}
                placeholder="mtn,08012345678"
                className="w-full rounded-xl border border-indigo/20 px-4 py-2.5 text-sm font-mono"
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
              <button
                onClick={create}
                disabled={saving}
                className="flex-1 rounded-xl bg-indigo px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Schedule distribution"}
              </button>
              <button onClick={() => setShowForm(false)} className="text-sm text-indigo/50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {schedules === null && <p className="text-sm text-indigo/50">Loading…</p>}
        {schedules?.length === 0 && !showForm && (
          <p className="rounded-2xl border border-dashed border-indigo/20 px-4 py-8 text-center text-sm text-indigo/50">
            No recurring distributions yet.
          </p>
        )}
        {schedules?.map((s) => (
          <div key={s.id} className="konek-card-shadow flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-indigo">
                {s.purpose} · {s.recipients.length} recipient{s.recipients.length === 1 ? "" : "s"}
              </p>
              <p className="truncate text-xs text-indigo/55">
                ₦{(Number(s.amount_minor_per_recipient) / 100).toLocaleString()} each ·{" "}
                {s.interval_days === 7 ? "Weekly" : "Monthly"} · Next {new Date(s.next_run_at).toLocaleDateString()}
                {s.last_status && ` · Last: ${STATUS_LABEL[s.last_status] ?? s.last_status}`}
              </p>
            </div>
            <button
              onClick={() => cancel(s.id)}
              disabled={cancelling === s.id}
              className="shrink-0 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
            >
              {cancelling === s.id ? "…" : "Cancel"}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
