"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Card, Grid, PageHeader } from "@/components/adminUi";
import { parsePlanSheet } from "@/lib/marketplace/planSheet";
import type { SupplierPlanInput } from "@/lib/marketplace/import";

interface Supplier {
  id: string;
  name: string | null;
  api_type: string | null;
  enabled: boolean;
  healthy: boolean;
  success_rate: string | null;
  average_response_ms: number | null;
  product_count: string;
  last_import: string | null;
}
interface SupplierCost {
  supplierId: string;
  supplierName: string | null;
  sku: string;
  costMinor: number;
  stockStatus: string;
  apiStatus: string;
  active: boolean;
}
interface Product {
  id: string;
  display_name: string;
  country: string | null;
  region: string | null;
  data_amount: string;
  validity: number;
  currency: string;
  display_price_minor: string | null;
  lowest_supplier_cost_minor: string | null;
  price_override_minor: string | null;
  promo_price_minor: string | null;
  recommended_supplier_id: string | null;
  active: boolean;
  suppliers: SupplierCost[];
}
interface Stats {
  catalogProducts: number;
  supplierProducts: number;
  avgMarginPct: number;
  avgMarkupPct: number;
}
interface Rule {
  id: string;
  name: string;
  min_cost_minor: string;
  max_cost_minor: string | null;
  markup_pct: string;
  category: string | null;
  country: string | null;
  active: boolean;
  priority: number;
}
interface ImportRun {
  id: string;
  supplier_name: string | null;
  supplier_id: string;
  source: string;
  status: string;
  products_imported: number;
  products_updated: number;
  products_failed: number;
  duration_ms: number | null;
  started_at: string;
}

function usd(minor: number | null | undefined) {
  if (minor == null) return "—";
  return `$${(Number(minor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function marginPct(cost: number | null, price: number | null) {
  if (!cost || !price) return null;
  return ((price - cost) / price) * 100;
}

type Tab = "dashboard" | "catalog" | "pricing" | "import";

export function MarketplaceConsole() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [imports, setImports] = useState<ImportRun[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  function loadCatalog() {
    fetch("/api/admin/marketplace/catalog")
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products ?? []);
        setStats(d.stats ?? null);
      });
  }
  function loadSuppliers() {
    fetch("/api/admin/marketplace/suppliers").then((r) => r.json()).then((d) => setSuppliers(d.suppliers ?? []));
  }
  function loadRules() {
    fetch("/api/admin/marketplace/pricing-rules").then((r) => r.json()).then((d) => setRules(d.rules ?? []));
  }
  function loadImports() {
    fetch("/api/admin/marketplace/imports").then((r) => r.json()).then((d) => setImports(d.imports ?? []));
  }
  useEffect(() => {
    loadCatalog();
    loadSuppliers();
    loadRules();
    loadImports();
  }, []);

  return (
    <>
      <PageHeader
        title="eSIM marketplace"
        description="One customer listing per plan, backed by many suppliers. Prices are derived from the lowest supplier cost via pricing rules; suppliers are chosen and failed over automatically at checkout."
      />

      <div className="mb-5 flex gap-2">
        {(["dashboard", "catalog", "pricing", "import"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${
              tab === t ? "bg-indigo text-white" : "bg-indigo/10 text-indigo/70"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {message && <p className="mb-3 text-sm font-semibold text-konek-green">{message}</p>}

      {tab === "dashboard" && <Dashboard stats={stats} suppliers={suppliers} imports={imports} />}
      {tab === "catalog" && <Catalog products={products} onReload={loadCatalog} onMsg={setMessage} />}
      {tab === "pricing" && <Pricing rules={rules} onReload={loadRules} onMsg={setMessage} />}
      {tab === "import" && (
        <ImportPanel
          suppliers={suppliers}
          imports={imports}
          onDone={() => {
            loadCatalog();
            loadImports();
            loadSuppliers();
          }}
          onMsg={setMessage}
        />
      )}
    </>
  );
}

// ---------------- Dashboard ----------------
function Dashboard({ stats, suppliers, imports }: { stats: Stats | null; suppliers: Supplier[]; imports: ImportRun[] }) {
  const best = [...suppliers].filter((s) => s.success_rate).sort((a, b) => Number(b.success_rate) - Number(a.success_rate))[0];
  return (
    <Grid>
      <div className="col-span-1 lg:col-span-12">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Catalog products", value: String(stats?.catalogProducts ?? 0) },
            { label: "Supplier products", value: String(stats?.supplierProducts ?? 0) },
            { label: "Avg margin", value: `${(stats?.avgMarginPct ?? 0).toFixed(0)}%` },
            { label: "Avg markup", value: `${(stats?.avgMarkupPct ?? 0).toFixed(0)}%` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border-soft bg-white p-3">
              <p className="text-xs text-text-secondary">{s.label}</p>
              <p className="mt-1 font-heading text-xl font-bold text-indigo">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="col-span-1 lg:col-span-6">
        <Card title="Suppliers">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border-soft text-xs uppercase text-text-secondary">
                <tr>
                  <th className="py-2 pr-3">Supplier</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Success</th>
                  <th className="py-2 pr-3 text-right">Avg ms</th>
                  <th className="py-2 text-right">Products</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} className="border-b border-border-soft">
                    <td className="py-2 pr-3 font-medium text-indigo">{s.name ?? s.id}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.enabled && s.healthy ? "bg-konek-green/10 text-konek-green" : "bg-red-50 text-red-600"}`}>
                        {s.enabled ? (s.healthy ? "healthy" : "down") : "disabled"}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{s.success_rate ? `${(Number(s.success_rate) * 100).toFixed(0)}%` : "—"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{s.average_response_ms ?? "—"}</td>
                    <td className="py-2 text-right tabular-nums">{s.product_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {best && <p className="mt-3 text-xs text-text-secondary">Best performing: <span className="font-semibold text-indigo">{best.name ?? best.id}</span></p>}
        </Card>
      </div>

      <div className="col-span-1 lg:col-span-6">
        <Card title="Recent imports">
          {imports.length === 0 ? (
            <p className="text-sm text-text-secondary">No imports yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {imports.slice(0, 6).map((i) => (
                <div key={i.id} className="flex items-center justify-between border-b border-border-soft py-2 text-sm last:border-0">
                  <div>
                    <p className="font-medium text-indigo">{i.supplier_name ?? i.supplier_id}</p>
                    <p className="text-[11px] text-text-secondary">
                      {i.source} · {new Date(i.started_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-xs text-text-secondary">
                    +{i.products_imported} new · {i.products_updated} upd
                    {i.products_failed ? ` · ${i.products_failed} failed` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Grid>
  );
}

// ---------------- Catalog ----------------
function Catalog({
  products,
  onReload,
  onMsg,
}: {
  products: Product[];
  onReload: () => void;
  onMsg: (m: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => !q || p.display_name.toLowerCase().includes(q) || (p.country ?? "").toLowerCase().includes(q));
  }, [products, search]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function override(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/marketplace/catalog/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    onMsg(res.ok ? "Saved." : "Save failed.");
    if (res.ok) onReload();
  }

  async function bulk(action: "activate" | "deactivate" | "delete") {
    if (selected.size === 0) return;
    if (action === "delete" && !confirm(`Permanently delete ${selected.size} product(s) and their supplier links?`)) return;
    const res = await fetch("/api/admin/marketplace/catalog/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], action }),
    });
    const d = await res.json().catch(() => ({}));
    onMsg(res.ok ? `${action}: ${d.affected} product(s).` : d.error ?? "Failed");
    if (res.ok) {
      setSelected(new Set());
      onReload();
    }
  }

  async function deleteOne(id: string) {
    if (!confirm("Permanently delete this product and its supplier links?")) return;
    const res = await fetch(`/api/admin/marketplace/catalog/${id}`, { method: "DELETE" });
    onMsg(res.ok ? "Deleted." : "Delete failed.");
    if (res.ok) onReload();
  }

  return (
    <Card
      title="Catalog"
      action={
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="w-48 rounded-lg border border-border-soft px-3 py-1.5 text-xs"
        />
      }
    >
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-hover-tint px-3 py-2 text-xs">
          <span className="font-semibold text-indigo">{selected.size} selected</span>
          <button onClick={() => bulk("activate")} className="rounded bg-konek-green/10 px-2 py-1 font-semibold text-konek-green">Activate</button>
          <button onClick={() => bulk("deactivate")} className="rounded bg-gold/10 px-2 py-1 font-semibold text-gold">Deactivate</button>
          <button onClick={() => bulk("delete")} className="rounded bg-red-50 px-2 py-1 font-semibold text-red-600">Delete</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-text-secondary">Clear</button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-border-soft text-xs uppercase text-text-secondary">
            <tr>
              <th className="py-2 pr-2"></th>
              <th className="py-2 pr-3">Product</th>
              <th className="py-2 pr-3 text-right">Lowest cost</th>
              <th className="py-2 pr-3 text-right">Price</th>
              <th className="py-2 pr-3 text-right">Margin</th>
              <th className="py-2 pr-3">Suppliers</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const cost = p.lowest_supplier_cost_minor == null ? null : Number(p.lowest_supplier_cost_minor);
              const price = p.display_price_minor == null ? null : Number(p.display_price_minor);
              const m = marginPct(cost, price);
              const inStock = p.suppliers.filter((s) => s.active && s.stockStatus !== "out_of_stock");
              return (
                <Fragment key={p.id}>
                  <tr className={`border-b border-border-soft ${p.active ? "" : "opacity-50"}`}>
                    <td className="py-2 pr-2">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} />
                    </td>
                    <td className="py-2 pr-3">
                      <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} className="text-left font-medium text-indigo hover:underline">
                        {p.display_name}
                      </button>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{usd(cost)}</td>
                    <td className="py-2 pr-3 text-right">
                      <input
                        defaultValue={price == null ? "" : (price / 100).toFixed(2)}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isFinite(v) && v > 0) override(p.id, { priceOverrideMinor: Math.round(v * 100) });
                        }}
                        className="w-20 rounded-lg border border-border-soft px-2 py-1 text-right text-xs tabular-nums"
                        title="Set a fixed price override"
                      />
                      {p.promo_price_minor && <span className="ml-1 text-[10px] font-semibold text-konek-green">PROMO</span>}
                    </td>
                    <td className={`py-2 pr-3 text-right text-xs tabular-nums ${m == null ? "text-text-secondary" : m < 0 ? "text-red-600" : m < 20 ? "text-gold" : "text-konek-green"}`}>
                      {m == null ? "—" : `${m.toFixed(0)}%`}
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {inStock.length} / {p.suppliers.length}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => override(p.id, { active: !p.active })}
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.active ? "bg-konek-green/10 text-konek-green" : "bg-red-50 text-red-600"}`}
                        >
                          {p.active ? "live" : "off"}
                        </button>
                        <button onClick={() => deleteOne(p.id)} title="Delete product" className="text-[11px] font-semibold text-red-600">
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === p.id && (
                    <tr className="bg-hover-tint">
                      <td colSpan={7} className="px-3 py-3">
                        <p className="mb-2 text-xs font-semibold text-indigo">Suppliers for this product</p>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          {p.suppliers.map((s) => (
                            <div key={s.supplierId + s.sku} className="flex items-center justify-between rounded-lg border border-border-soft bg-white px-3 py-2 text-xs">
                              <div>
                                <span className="font-semibold text-indigo">{s.supplierName ?? s.supplierId}</span>
                                <span className="ml-2 text-text-secondary">{s.sku}</span>
                                {s.stockStatus === "out_of_stock" && <span className="ml-2 rounded bg-red-50 px-1.5 text-red-600">out of stock</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="tabular-nums">{usd(s.costMinor)}</span>
                                <button
                                  onClick={() => override(p.id, { recommendedSupplierId: p.recommended_supplier_id === s.supplierId ? null : s.supplierId })}
                                  className={`rounded px-2 py-0.5 font-semibold ${p.recommended_supplier_id === s.supplierId ? "bg-indigo text-white" : "bg-indigo/10 text-indigo"}`}
                                >
                                  {p.recommended_supplier_id === s.supplierId ? "pinned" : "pin"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => override(p.id, { priceOverrideMinor: null, promoPriceMinor: null, markupOverridePct: null })}
                          className="mt-2 text-[11px] font-semibold text-indigo/60 hover:underline"
                        >
                          Clear overrides · reprice from rules
                        </button>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && <p className="py-6 text-center text-sm text-text-secondary">No products yet. Import a supplier price sheet.</p>}
      </div>
    </Card>
  );
}

// ---------------- Pricing (rules + preview) ----------------
function Pricing({ rules, onReload, onMsg }: { rules: Rule[]; onReload: () => void; onMsg: (m: string) => void }) {
  const [cost, setCost] = useState("2.85");
  const [country, setCountry] = useState("");
  const [preview, setPreview] = useState<{ appliedRule: string; markupPct: number; sellingPriceMinor: number; profitMinor: number; marginPct: number } | null>(null);
  const [newRule, setNewRule] = useState({ name: "", min: "", max: "", markup: "" });

  async function runPreview() {
    const res = await fetch("/api/admin/marketplace/calculate-price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ costMinor: Math.round(Number(cost) * 100), country: country || null, category: "esim" }),
    });
    setPreview(await res.json().catch(() => null));
  }

  async function addRule() {
    const res = await fetch("/api/admin/marketplace/pricing-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newRule.name,
        minCostMinor: Math.round(Number(newRule.min || 0) * 100),
        maxCostMinor: newRule.max ? Math.round(Number(newRule.max) * 100) : null,
        markupPct: Number(newRule.markup),
        category: "esim",
        country: country || null,
      }),
    });
    const d = await res.json().catch(() => ({}));
    onMsg(res.ok ? "Rule added." : d.error ?? "Failed");
    if (res.ok) {
      setNewRule({ name: "", min: "", max: "", markup: "" });
      onReload();
    }
  }

  async function delRule(id: string) {
    if (!confirm("Delete this pricing rule?")) return;
    await fetch(`/api/admin/marketplace/pricing-rules/${id}`, { method: "DELETE" });
    onReload();
  }

  return (
    <Grid>
      <div className="col-span-1 lg:col-span-6">
        <Card title="Pricing preview">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-text-secondary">
              Supplier cost ($)
              <input value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d.]/g, ""))} className="mt-1 w-24 rounded-lg border border-border-soft px-2 py-1.5 text-sm" />
            </label>
            <label className="text-xs text-text-secondary">
              Country (opt)
              <input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} placeholder="NG" className="mt-1 w-20 rounded-lg border border-border-soft px-2 py-1.5 text-sm" />
            </label>
            <button onClick={runPreview} className="rounded-lg bg-indigo px-4 py-2 text-sm font-semibold text-white">
              Preview
            </button>
          </div>
          {preview && (
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Stat label="Applied rule" value={preview.appliedRule} />
              <Stat label="Markup" value={`${preview.markupPct}%`} />
              <Stat label="Selling price" value={usd(preview.sellingPriceMinor)} tone="text-konek-green" />
              <Stat label="Profit" value={usd(preview.profitMinor)} />
              <Stat label="Margin" value={`${preview.marginPct}%`} />
            </div>
          )}
        </Card>
      </div>

      <div className="col-span-1 lg:col-span-6">
        <Card title="Pricing rules (tiered markup)">
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <input value={newRule.name} onChange={(e) => setNewRule((r) => ({ ...r, name: e.target.value }))} placeholder="Name" className="w-32 rounded-lg border border-border-soft px-2 py-1.5 text-xs" />
            <input value={newRule.min} onChange={(e) => setNewRule((r) => ({ ...r, min: e.target.value.replace(/[^\d.]/g, "") }))} placeholder="min $" className="w-16 rounded-lg border border-border-soft px-2 py-1.5 text-xs" />
            <input value={newRule.max} onChange={(e) => setNewRule((r) => ({ ...r, max: e.target.value.replace(/[^\d.]/g, "") }))} placeholder="max $" className="w-16 rounded-lg border border-border-soft px-2 py-1.5 text-xs" />
            <input value={newRule.markup} onChange={(e) => setNewRule((r) => ({ ...r, markup: e.target.value.replace(/[^\d.]/g, "") }))} placeholder="markup %" className="w-20 rounded-lg border border-border-soft px-2 py-1.5 text-xs" />
            <button onClick={addRule} className="rounded-lg bg-konek-green px-3 py-1.5 text-xs font-semibold text-white">
              Add
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border-soft text-xs uppercase text-text-secondary">
                <tr>
                  <th className="py-2 pr-3">Rule</th>
                  <th className="py-2 pr-3">Band</th>
                  <th className="py-2 pr-3 text-right">Markup</th>
                  <th className="py-2 pr-3">Scope</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-b border-border-soft">
                    <td className="py-2 pr-3 font-medium text-indigo">{r.name}</td>
                    <td className="py-2 pr-3 text-xs tabular-nums">
                      {usd(Number(r.min_cost_minor))}–{r.max_cost_minor ? usd(Number(r.max_cost_minor)) : "∞"}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{Number(r.markup_pct).toFixed(0)}%</td>
                    <td className="py-2 pr-3 text-xs text-text-secondary">{[r.category, r.country].filter(Boolean).join(" · ") || "global"}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => delRule(r.id)} className="text-xs font-semibold text-red-600">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Grid>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border-soft bg-white p-3">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className={`mt-0.5 font-semibold ${tone ?? "text-indigo"}`}>{value}</p>
    </div>
  );
}

// ---------------- Import ----------------
function ImportPanel({
  suppliers,
  imports,
  onDone,
  onMsg,
}: {
  suppliers: Supplier[];
  imports: ImportRun[];
  onDone: () => void;
  onMsg: (m: string) => void;
}) {
  const [supplierId, setSupplierId] = useState("");
  const [rows, setRows] = useState<SupplierPlanInput[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [replace, setReplace] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setErrors([]);
    setRows(null);
    if (/\.(xlsx|xls|pdf)$/i.test(file.name)) {
      setErrors(["Excel and PDF cannot be read directly. Export to CSV first."]);
      return;
    }
    const parsed = parsePlanSheet(await file.text());
    setErrors(parsed.errors);
    setRows(parsed.rows.length ? parsed.rows : null);
  }

  async function runCsv() {
    if (!supplierId || !rows) return;
    setBusy(true);
    const res = await fetch("/api/admin/marketplace/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierId, plans: rows, deactivateMissing: replace }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    onMsg(res.ok ? `Imported: ${d.imported} new, ${d.updated} updated, ${d.failed} failed.` : d.error ?? "Import failed");
    if (res.ok) {
      setRows(null);
      if (fileRef.current) fileRef.current.value = "";
      onDone();
    }
  }

  async function runSync() {
    if (!supplierId) return;
    setBusy(true);
    const res = await fetch("/api/admin/marketplace/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierId }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    onMsg(res.ok ? `Synced: ${d.imported} new, ${d.updated} updated.` : d.error ?? "Sync failed");
    if (res.ok) onDone();
  }

  return (
    <Grid>
      <div className="col-span-1 lg:col-span-12">
        <Card title="Import supplier plans">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="rounded-lg border border-border-soft px-2 py-1.5 text-sm">
              <option value="">Choose supplier…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name ?? s.id}
                </option>
              ))}
            </select>
            <button onClick={runSync} disabled={!supplierId || busy} className="rounded-lg bg-indigo px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
              Sync via API
            </button>
          </div>

          <p className="mb-2 text-xs text-text-secondary">
            …or upload a CSV: <code>sku, country, operator, data, validity, cost</code> (aliases like package_code / buying_price work). Cost in dollars.
          </p>
          <input ref={fileRef} type="file" accept=".csv,.tsv,.xlsx,.xls,.pdf" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} className="text-xs" />
          <label className="ml-3 text-xs text-text-secondary">
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="mr-1" />
            Retire SKUs missing from this sheet
          </label>

          {errors.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-red-600">
              {errors.slice(0, 8).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          {rows && (
            <div className="mt-3">
              <p className="mb-2 text-xs text-text-secondary">Parsed {rows.length} plans.</p>
              <button onClick={runCsv} disabled={!supplierId || busy} className="rounded-lg bg-konek-green px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                {busy ? "Importing…" : `Import ${rows.length} plans`}
              </button>
            </div>
          )}
        </Card>
      </div>

      <div className="col-span-1 lg:col-span-12">
        <Card title="Import history">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border-soft text-xs uppercase text-text-secondary">
                <tr>
                  <th className="py-2 pr-3">Supplier</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">New</th>
                  <th className="py-2 pr-3 text-right">Updated</th>
                  <th className="py-2 pr-3 text-right">Failed</th>
                  <th className="py-2 pr-3 text-right">Duration</th>
                  <th className="py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {imports.map((i) => (
                  <tr key={i.id} className="border-b border-border-soft">
                    <td className="py-2 pr-3 font-medium text-indigo">{i.supplier_name ?? i.supplier_id}</td>
                    <td className="py-2 pr-3 text-xs">{i.source}</td>
                    <td className="py-2 pr-3 text-xs">{i.status}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{i.products_imported}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{i.products_updated}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{i.products_failed}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{i.duration_ms != null ? `${i.duration_ms}ms` : "—"}</td>
                    <td className="py-2 text-xs text-text-secondary">{new Date(i.started_at).toLocaleString()}</td>
                  </tr>
                ))}
                {imports.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-sm text-text-secondary">
                      No imports yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Grid>
  );
}
