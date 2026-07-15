"use client";

import { useEffect, useMemo, useState } from "react";

interface CatalogItem {
  id: string;
  vendor: string;
  service_type: string;
  external_id: string;
  name: string;
  network: string | null;
  cost_minor: string;
  price_minor: string;
  currency: string;
  active: boolean;
}

interface FxConfig {
  ngnPerUsd: number;
  usdNgnSpreadPct: number;
}

const SERVICE_LABEL: Record<string, string> = {
  data: "Data",
  cable: "Cable TV",
  exam_pin: "Exam pins",
  gift_card: "Gift cards",
  esim: "eSIM",
};

export function RatesConsole() {
  const [fx, setFx] = useState<FxConfig | null>(null);
  const [fxDraft, setFxDraft] = useState({ ngnPerUsd: "", usdNgnSpreadPct: "" });
  const [fxSaving, setFxSaving] = useState(false);
  const [fxMsg, setFxMsg] = useState<string | null>(null);

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  function load() {
    fetch("/api/admin/rates/fx")
      .then((res) => res.json())
      .then((data: FxConfig) => {
        setFx(data);
        setFxDraft({ ngnPerUsd: String(data.ngnPerUsd), usdNgnSpreadPct: String(data.usdNgnSpreadPct * 100) });
      });
    fetch("/api/admin/rates/catalog")
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []));
  }

  useEffect(load, []);

  async function saveFx() {
    const ngnPerUsd = Number(fxDraft.ngnPerUsd);
    const usdNgnSpreadPct = Number(fxDraft.usdNgnSpreadPct) / 100;
    if (!Number.isFinite(ngnPerUsd) || ngnPerUsd <= 0) {
      setFxMsg("Enter a valid NGN/USD rate");
      return;
    }
    setFxSaving(true);
    setFxMsg(null);
    const res = await fetch("/api/admin/rates/fx", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ngnPerUsd, usdNgnSpreadPct }),
    });
    setFxSaving(false);
    const body = await res.json().catch(() => ({}));
    setFxMsg(res.ok ? "Saved" : body.error ?? "Failed to save");
    if (res.ok) load();
  }

  async function saveCatalogPrice(item: CatalogItem) {
    const naira = drafts[item.id];
    const priceMinor = Math.round(Number(naira) * 100);
    if (!Number.isInteger(priceMinor) || priceMinor <= 0) return;
    setSavingId(item.id);
    await fetch(`/api/admin/rates/catalog/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceMinor }),
    });
    setSavingId(null);
    load();
  }

  async function toggleActive(item: CatalogItem) {
    await fetch(`/api/admin/rates/catalog/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !item.active }),
    });
    load();
  }

  const serviceTypes = useMemo(() => Array.from(new Set(items.map((i) => i.service_type))), [items]);
  const visible = filter === "all" ? items : items.filter((i) => i.service_type === filter);

  return (
    <>
      <h1 className="font-heading text-xl font-bold text-indigo mb-1">Rates configuration</h1>
      <p className="text-sm text-indigo/60 mb-6">
        The FX rate governs every USD-priced product (intl top-up, eSIM, gift cards, dollar-account
        conversion). Catalog prices apply to data, cable, exam pins, gift cards and eSIM plans.
        Airtime, electricity and betting are pass-through (charged at the amount the user enters).
      </p>

      <section className="rounded-2xl border border-indigo/10 bg-white p-5 mb-8">
        <p className="text-sm font-semibold text-indigo mb-3">FX rate</p>
        {fx ? (
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div>
              <label className="block text-xs text-indigo/60 mb-1">NGN per USD</label>
              <input
                value={fxDraft.ngnPerUsd}
                onChange={(e) => setFxDraft((d) => ({ ...d, ngnPerUsd: e.target.value.replace(/[^\d.]/g, "") }))}
                className="w-32 rounded-lg border border-indigo/20 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-indigo/60 mb-1">Spread (%)</label>
              <input
                value={fxDraft.usdNgnSpreadPct}
                onChange={(e) => setFxDraft((d) => ({ ...d, usdNgnSpreadPct: e.target.value.replace(/[^\d.]/g, "") }))}
                className="w-24 rounded-lg border border-indigo/20 px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={saveFx}
              disabled={fxSaving}
              className="rounded-lg bg-indigo text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
            >
              {fxSaving ? "Saving…" : "Save"}
            </button>
            {fxMsg && <span className="text-xs text-indigo/60">{fxMsg}</span>}
          </div>
        ) : (
          <p className="text-sm text-indigo/50">Loading…</p>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-indigo">Catalog pricing</p>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-indigo/20 px-2 py-1.5 text-xs"
          >
            <option value="all">All services</option>
            {serviceTypes.map((s) => (
              <option key={s} value={s}>
                {SERVICE_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          {visible.map((item) => (
            <div
              key={item.id}
              className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border px-4 py-3 ${
                item.active ? "border-indigo/10 bg-white" : "border-indigo/10 bg-indigo/5 opacity-60"
              }`}
            >
              <div className="min-w-0 sm:flex-1">
                <p className="text-sm font-medium text-indigo truncate">{item.name}</p>
                <p className="text-xs text-indigo/50">
                  {SERVICE_LABEL[item.service_type] ?? item.service_type} · {item.vendor}
                  {item.network ? ` · ${item.network}` : ""} · cost {item.currency}{" "}
                  {(Number(item.cost_minor) / 100).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <span className="text-xs text-indigo/50">{item.currency}</span>
                <input
                  defaultValue={(Number(item.price_minor) / 100).toString()}
                  onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                  className="w-24 rounded-lg border border-indigo/20 px-2 py-1.5 text-sm text-right"
                />
                <button
                  onClick={() => saveCatalogPrice(item)}
                  disabled={savingId === item.id}
                  className="rounded-lg bg-indigo text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => toggleActive(item)}
                  className={`rounded-lg text-xs font-semibold px-3 py-1.5 ${
                    item.active ? "bg-red-50 text-red-600" : "bg-konek-green/10 text-konek-green"
                  }`}
                >
                  {item.active ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          ))}
          {visible.length === 0 && <p className="text-sm text-indigo/50">No catalog items synced yet.</p>}
        </div>
      </section>
    </>
  );
}
