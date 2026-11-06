"use client";

import { useEffect, useState } from "react";
import { Card, Grid, PageHeader } from "@/components/adminUi";
import { CatalogTable } from "./CatalogTable";

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

const BLANK_NEW = {
  serviceType: "data",
  externalId: "",
  name: "",
  network: "",
  currency: "NGN",
  costNaira: "",
  priceNaira: "",
};

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

  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState({ ...BLANK_NEW });
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", network: "", priceNaira: "", costNaira: "" });
  const [editMsg, setEditMsg] = useState<string | null>(null);

  async function createItem() {
    setCreateMsg(null);
    const priceMinor = Math.round(Number(draft.priceNaira) * 100);
    const costMinor = draft.costNaira ? Math.round(Number(draft.costNaira) * 100) : 0;
    if (!draft.serviceType.trim() || !draft.externalId.trim() || !draft.name.trim()) {
      setCreateMsg("Service type, external id and name are required");
      return;
    }
    if (!Number.isInteger(priceMinor) || priceMinor <= 0) {
      setCreateMsg("Enter a valid price");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/admin/rates/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceType: draft.serviceType.trim(),
        externalId: draft.externalId.trim(),
        name: draft.name.trim(),
        network: draft.network.trim() || undefined,
        currency: draft.currency,
        priceMinor,
        costMinor,
      }),
    });
    setCreating(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setCreateMsg(body.error ?? "Failed to create");
      return;
    }
    setDraft({ ...BLANK_NEW });
    setShowNew(false);
    load();
  }

  function openEdit(item: CatalogItem) {
    setEditing(item);
    setEditMsg(null);
    setEditDraft({
      name: item.name,
      network: item.network ?? "",
      priceNaira: (Number(item.price_minor) / 100).toString(),
      costNaira: (Number(item.cost_minor) / 100).toString(),
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setEditMsg(null);
    const res = await fetch(`/api/admin/rates/catalog/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editDraft.name.trim(),
        network: editDraft.network.trim(),
        priceMinor: Math.round(Number(editDraft.priceNaira) * 100),
        costMinor: Math.round(Number(editDraft.costNaira) * 100),
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setEditMsg(body.error ?? "Failed to save");
      return;
    }
    setEditing(null);
    load();
  }

  async function deleteItem(item: CatalogItem) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/rates/catalog/${item.id}`, { method: "DELETE" });
    setEditing(null);
    load();
  }

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

  return (
    <>
      <PageHeader
        title="Rates configuration"
        description="The FX rate governs every USD-priced product (intl top-up, eSIM, gift cards, dollar-account conversion). Catalog prices apply to data, cable, exam pins, gift cards and eSIM plans. Airtime, electricity and betting are pass-through (charged at the amount the user enters)."
      />

      <Grid>
        <div className="col-span-1 lg:col-span-12">
          <Card title="FX rate">
            {fx ? (
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
                <div>
                  <label className="mb-1 block text-xs text-text-secondary">NGN per USD</label>
                  <input
                    value={fxDraft.ngnPerUsd}
                    onChange={(e) => setFxDraft((d) => ({ ...d, ngnPerUsd: e.target.value.replace(/[^\d.]/g, "") }))}
                    className="w-32 rounded-lg border border-border-soft px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-text-secondary">Spread (%)</label>
                  <input
                    value={fxDraft.usdNgnSpreadPct}
                    onChange={(e) => setFxDraft((d) => ({ ...d, usdNgnSpreadPct: e.target.value.replace(/[^\d.]/g, "") }))}
                    className="w-24 rounded-lg border border-border-soft px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={saveFx}
                  disabled={fxSaving}
                  className="rounded-lg bg-indigo px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {fxSaving ? "Saving…" : "Save"}
                </button>
                {fxMsg && <span className="text-xs text-text-secondary">{fxMsg}</span>}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">Loading…</p>
            )}
          </Card>
        </div>

        <div className="col-span-1 lg:col-span-12">
          <Card
            title="Catalog & products"
            action={
              <button
                onClick={() => setShowNew((s) => !s)}
                className="rounded-lg bg-raviion-green px-3 py-1.5 text-xs font-semibold text-white"
              >
                {showNew ? "Close" : "+ New product"}
              </button>
            }
          >
            {showNew && (
              <div className="mb-4 rounded-xl border border-raviion-green/30 bg-raviion-green/5 p-4">
                <p className="mb-3 text-sm font-semibold text-indigo">New catalog product</p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <label className="text-xs text-text-secondary">
                    Service type
                    <input
                      list="svc-types"
                      value={draft.serviceType}
                      onChange={(e) => setDraft((d) => ({ ...d, serviceType: e.target.value }))}
                      placeholder="data, router_mifi…"
                      className="mt-1 w-full rounded-lg border border-border-soft px-2 py-1.5 text-sm text-indigo"
                    />
                    <datalist id="svc-types">
                      {["data", "cable", "exam_pin", "gift_card", "esim", "router_mifi", "intl_data"].map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </label>
                  <label className="text-xs text-text-secondary">
                    External id
                    <input
                      value={draft.externalId}
                      onChange={(e) => setDraft((d) => ({ ...d, externalId: e.target.value }))}
                      placeholder="unique-plan-id"
                      className="mt-1 w-full rounded-lg border border-border-soft px-2 py-1.5 text-sm text-indigo"
                    />
                  </label>
                  <label className="text-xs text-text-secondary">
                    Network / brand
                    <input
                      value={draft.network}
                      onChange={(e) => setDraft((d) => ({ ...d, network: e.target.value }))}
                      placeholder="MTN, DStv…"
                      className="mt-1 w-full rounded-lg border border-border-soft px-2 py-1.5 text-sm text-indigo"
                    />
                  </label>
                  <label className="col-span-2 text-xs text-text-secondary md:col-span-3">
                    Name
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                      placeholder="e.g. 1.5GB Monthly"
                      className="mt-1 w-full rounded-lg border border-border-soft px-2 py-1.5 text-sm text-indigo"
                    />
                  </label>
                  <label className="text-xs text-text-secondary">
                    Currency
                    <select
                      value={draft.currency}
                      onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border-soft px-2 py-1.5 text-sm text-indigo"
                    >
                      <option value="NGN">NGN</option>
                      <option value="USD">USD</option>
                    </select>
                  </label>
                  <label className="text-xs text-text-secondary">
                    Cost (vendor)
                    <input
                      value={draft.costNaira}
                      onChange={(e) => setDraft((d) => ({ ...d, costNaira: e.target.value.replace(/[^\d.]/g, "") }))}
                      className="mt-1 w-full rounded-lg border border-border-soft px-2 py-1.5 text-sm text-indigo"
                    />
                  </label>
                  <label className="text-xs text-text-secondary">
                    Price (customer)
                    <input
                      value={draft.priceNaira}
                      onChange={(e) => setDraft((d) => ({ ...d, priceNaira: e.target.value.replace(/[^\d.]/g, "") }))}
                      className="mt-1 w-full rounded-lg border border-border-soft px-2 py-1.5 text-sm text-indigo"
                    />
                  </label>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={createItem}
                    disabled={creating}
                    className="rounded-lg bg-indigo px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {creating ? "Creating…" : "Create product"}
                  </button>
                  {createMsg && <span className="text-xs text-red-600">{createMsg}</span>}
                </div>
              </div>
            )}
            <CatalogTable items={items} onReload={load} onEdit={openEdit} />
          </Card>
        </div>
      </Grid>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-heading font-bold text-indigo">Edit product</h3>
              <button onClick={() => setEditing(null)} className="text-sm text-text-secondary">Close</button>
            </div>
            <p className="mb-4 text-xs text-text-secondary">
              {SERVICE_LABEL[editing.service_type] ?? editing.service_type} · {editing.vendor} · {editing.external_id}
            </p>
            <div className="flex flex-col gap-3">
              <label className="text-xs text-text-secondary">
                Name
                <input
                  value={editDraft.name}
                  onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2 text-sm text-indigo"
                />
              </label>
              <label className="text-xs text-text-secondary">
                Network / brand
                <input
                  value={editDraft.network}
                  onChange={(e) => setEditDraft((d) => ({ ...d, network: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2 text-sm text-indigo"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-text-secondary">
                  Cost ({editing.currency})
                  <input
                    value={editDraft.costNaira}
                    onChange={(e) => setEditDraft((d) => ({ ...d, costNaira: e.target.value.replace(/[^\d.]/g, "") }))}
                    className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2 text-sm text-indigo"
                  />
                </label>
                <label className="text-xs text-text-secondary">
                  Price ({editing.currency})
                  <input
                    value={editDraft.priceNaira}
                    onChange={(e) => setEditDraft((d) => ({ ...d, priceNaira: e.target.value.replace(/[^\d.]/g, "") }))}
                    className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2 text-sm text-indigo"
                  />
                </label>
              </div>
            </div>
            {editMsg && <p className="mt-3 text-xs text-red-600">{editMsg}</p>}
            <div className="mt-5 flex items-center justify-between">
              <button onClick={() => deleteItem(editing)} className="text-sm font-semibold text-red-600">
                Delete
              </button>
              <button onClick={saveEdit} className="rounded-lg bg-indigo px-5 py-2 text-sm font-semibold text-white">
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
