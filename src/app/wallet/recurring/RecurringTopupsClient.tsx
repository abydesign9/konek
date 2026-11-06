"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ChipPicker } from "@/components/ChipPicker";
import { COUNTRIES, detectCountry, findCountry, type Country } from "@/lib/intl/carriers";

const PRESETS_USD_MINOR = [500, 1000, 2000, 5000];
const INTERVALS = [
  { days: 7, label: "Weekly" },
  { days: 30, label: "Monthly" },
];

function formatUsd(minor: number) {
  return `$${(minor / 100).toLocaleString()}`;
}

interface Schedule {
  id: string;
  phone: string;
  network: string;
  amount_minor: string;
  interval_days: number;
  next_run_at: string;
  active: boolean;
  last_run_at: string | null;
  last_status: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  delivered: "Delivered",
  failed: "Failed",
  skipped_balance: "Skipped — low balance",
  skipped_kyc: "Skipped — verify account",
};

export function RecurringTopupsClient() {
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("NG");
  const [carrier, setCarrier] = useState<string | null>(null);
  const [amountMinor, setAmountMinor] = useState<number | null>(null);
  const [intervalDays, setIntervalDays] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const country: Country = findCountry(countryCode) ?? COUNTRIES[0];

  function load() {
    fetch("/api/recurring/topups")
      .then((r) => r.json())
      .then((d) => setSchedules(d.schedules ?? []));
  }
  useEffect(load, []);

  function onPhoneChange(v: string) {
    setPhone(v);
    const detected = detectCountry(v);
    if (detected) {
      setCountryCode(detected.code);
      setCarrier(null);
    }
  }

  async function create() {
    if (phone.length < 6 || !carrier || !amountMinor) {
      setError("Enter a phone number, choose a carrier, and pick an amount");
      return;
    }
    setError(null);
    setSaving(true);
    const res = await fetch("/api/recurring/topups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, network: `${country.code}:${carrier}`, amountMinor, intervalDays }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not create schedule");
      return;
    }
    setShowForm(false);
    setPhone("");
    setCarrier(null);
    setAmountMinor(null);
    load();
  }

  async function cancel(id: string) {
    setCancelling(id);
    await fetch(`/api/recurring/topups/${id}`, { method: "DELETE" });
    setCancelling(null);
    load();
  }

  return (
    <main className="min-h-screen bg-background pb-12">
      <PageHeader
        title="Recurring top-ups"
        backHref="/buy/intl-topup"
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
          <div className="raviion-card-shadow flex flex-col gap-3 rounded-2xl bg-white px-5 py-5">
            <input
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="Recipient phone number"
              className="w-full rounded-xl border border-indigo/20 px-4 py-2.5 text-sm"
            />
            <ChipPicker
              options={country.carriers.map((c) => ({ id: c.id, label: c.name }))}
              value={carrier}
              onChange={setCarrier}
            />
            <div className="grid grid-cols-4 gap-2">
              {PRESETS_USD_MINOR.map((p) => (
                <button
                  key={p}
                  onClick={() => setAmountMinor(p)}
                  className={`rounded-xl px-2 py-2 text-xs font-semibold ${
                    amountMinor === p ? "bg-indigo text-white" : "bg-hover-tint text-indigo/60"
                  }`}
                >
                  {formatUsd(p)}
                </button>
              ))}
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
                {saving ? "Saving…" : "Schedule top-up"}
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
            No recurring top-ups yet. Set one up to send credit on autopilot.
          </p>
        )}
        {schedules?.map((s) => (
          <div key={s.id} className="raviion-card-shadow flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-indigo">
                {formatUsd(Number(s.amount_minor))} · {s.interval_days === 7 ? "Weekly" : "Monthly"}
              </p>
              <p className="truncate text-xs text-indigo/55">
                To {s.phone} · Next {new Date(s.next_run_at).toLocaleDateString()}
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
