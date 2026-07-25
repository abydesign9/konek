"use client";

import { useEffect, useState } from "react";
import { Card, PageHeader, Badge } from "@/components/adminUi";

interface Product {
  id: string;
  name: string;
  currency: string;
  formFactor: "virtual" | "physical";
  brand: string;
  description: string | null;
  creationFeeMinor: number;
  authorizationFeeMinor: number;
  fundingFeePct: number;
  fundingFeeMinMinor: number;
  fundingFeeMaxMinor: number | null;
  declineFeeMinor: number;
  disputeFeeMinor: number;
  intlFeePct: number;
  intlFeeFixedMinor: number;
  active: boolean;
  sortOrder: number;
}

// Fields shown as money inputs (major units) mapped to their camelCase API key.
const MONEY_FIELDS: [keyof Product, string][] = [
  ["creationFeeMinor", "Creation fee"],
  ["authorizationFeeMinor", "Authorization fee (per txn)"],
  ["fundingFeeMinMinor", "Funding fee min"],
  ["fundingFeeMaxMinor", "Funding fee max"],
  ["declineFeeMinor", "Decline fee"],
  ["disputeFeeMinor", "Dispute fee"],
  ["intlFeeFixedMinor", "Intl fee (fixed)"],
];
const PCT_FIELDS: [keyof Product, string][] = [
  ["fundingFeePct", "Funding fee %"],
  ["intlFeePct", "Intl fee %"],
];

export function CardProductsConsole() {
  const [products, setProducts] = useState<Product[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newCurrency, setNewCurrency] = useState("USD");
  const [newForm, setNewForm] = useState("virtual");

  function load() {
    fetch("/api/admin/card-products").then((r) => r.json()).then((d) => setProducts(d.products ?? []));
  }
  useEffect(load, []);

  async function patch(id: string, key: string, value: unknown) {
    const res = await fetch(`/api/admin/card-products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    setMsg(res.ok ? "Saved." : "Save failed.");
    if (res.ok) load();
  }

  async function create() {
    if (!newName.trim()) return setMsg("Enter a name");
    const res = await fetch("/api/admin/card-products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), currency: newCurrency, formFactor: newForm }),
    });
    setMsg(res.ok ? "Product created." : "Failed");
    if (res.ok) {
      setNewName("");
      load();
    }
  }

  async function remove(p: Product) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const res = await fetch(`/api/admin/card-products/${p.id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    setMsg(d.message ?? "Deleted.");
    load();
  }

  const sym = (c: string) => (c === "USD" ? "$" : "₦");

  return (
    <>
      <PageHeader
        title="Card products"
        description="Define each card type and its full fee schedule. These fees are read by the app: the creation and dispute fees are charged live, and the whole schedule is shown to customers on the card page before they create a card."
      />
      {msg && <p className="mb-3 text-sm font-semibold text-konek-green">{msg}</p>}

      <Card title="Add a card product" className="mb-6">
        <div className="flex flex-wrap items-end gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name (e.g. Naira Card)" className="w-52 rounded-lg border border-border-soft px-3 py-2 text-sm" />
          <select value={newCurrency} onChange={(e) => setNewCurrency(e.target.value)} className="rounded-lg border border-border-soft px-2 py-2 text-sm">
            <option value="USD">USD</option>
            <option value="NGN">NGN</option>
          </select>
          <select value={newForm} onChange={(e) => setNewForm(e.target.value)} className="rounded-lg border border-border-soft px-2 py-2 text-sm">
            <option value="virtual">Virtual</option>
            <option value="physical">Physical</option>
          </select>
          <button onClick={create} className="rounded-lg bg-konek-green px-4 py-2 text-sm font-semibold text-white">Add</button>
        </div>
      </Card>

      <div className="space-y-5">
        {products.map((p) => (
          <Card key={p.id} title={`${p.name} · ${p.currency} · ${p.formFactor}`} action={
            <div className="flex items-center gap-2">
              <button onClick={() => patch(p.id, "active", !p.active)}>
                <Badge tone={p.active ? "green" : "neutral"}>{p.active ? "active" : "hidden"}</Badge>
              </button>
              <button onClick={() => remove(p)} className="text-xs font-semibold text-red-600">Delete</button>
            </div>
          }>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {MONEY_FIELDS.map(([key, label]) => (
                <label key={key} className="text-xs text-text-secondary">
                  {label} ({sym(p.currency)})
                  <input
                    defaultValue={p[key] == null ? "" : (Number(p[key]) / 100).toString()}
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      const v = raw === "" ? "" : Math.round(Number(raw) * 100);
                      patch(p.id, key as string, v);
                    }}
                    className="mt-1 w-full rounded-lg border border-border-soft px-2 py-1.5 text-right text-xs tabular-nums"
                  />
                </label>
              ))}
              {PCT_FIELDS.map(([key, label]) => (
                <label key={key} className="text-xs text-text-secondary">
                  {label}
                  <input
                    defaultValue={String(p[key] ?? 0)}
                    onBlur={(e) => patch(p.id, key as string, Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-border-soft px-2 py-1.5 text-right text-xs tabular-nums"
                  />
                </label>
              ))}
              <label className="col-span-2 text-xs text-text-secondary md:col-span-3 lg:col-span-4">
                Description
                <input
                  defaultValue={p.description ?? ""}
                  onBlur={(e) => patch(p.id, "description", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border-soft px-2 py-1.5 text-xs"
                />
              </label>
            </div>
          </Card>
        ))}
        {products.length === 0 && <p className="text-sm text-text-secondary">No card products yet.</p>}
      </div>
    </>
  );
}
