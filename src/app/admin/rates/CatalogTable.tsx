"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { parsePriceSheet, type ParsedRow } from "@/lib/admin/priceSheet";

export interface CatalogItem {
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

const SERVICE_LABEL: Record<string, string> = {
  data: "Data",
  cable: "Cable TV",
  exam_pin: "Exam pins",
  gift_card: "Gift cards",
  esim: "eSIM",
  router_mifi: "Router & MiFi",
  intl_data: "Intl data",
  intl_topup: "Intl top-up",
};

function money(minor: number, currency: string) {
  const sym = currency === "USD" ? "$" : currency === "NGN" ? "₦" : `${currency} `;
  return `${sym}${(minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function marginPct(cost: number, price: number): number | null {
  if (!cost) return null;
  return ((price - cost) / cost) * 100;
}

// Finance/ops view of the catalogue: a dense, filterable table with inline price
// editing, bulk cost+X% re-pricing, and price-sheet import.
export function CatalogTable({
  items,
  onReload,
  onEdit,
}: {
  items: CatalogItem[];
  onReload: () => void;
  onEdit: (item: CatalogItem) => void;
}) {
  const [service, setService] = useState("all");
  const [vendor, setVendor] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Markup tool
  const [markupPct, setMarkupPct] = useState("20");
  const [preview, setPreview] = useState<{ count: number; sample: string[] } | null>(null);

  // Import tool
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<ParsedRow[] | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importService, setImportService] = useState("");
  const [importVendor, setImportVendor] = useState("manual");
  const [replaceMissing, setReplaceMissing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const services = useMemo(() => Array.from(new Set(items.map((i) => i.service_type))).sort(), [items]);
  const vendors = useMemo(() => Array.from(new Set(items.map((i) => i.vendor))).sort(), [items]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (i) =>
        (service === "all" || i.service_type === service) &&
        (vendor === "all" || i.vendor === vendor) &&
        (!q || i.name.toLowerCase().includes(q) || i.external_id.toLowerCase().includes(q) || (i.network ?? "").toLowerCase().includes(q))
    );
  }, [items, service, vendor, search]);

  // Segregate plans by operator/provider (MTN, Airtel… under Data; DStv, GOtv…
  // under Cable). Grouping key is the network; items without one fall under
  // "Other". Keeps a long catalogue scannable.
  const grouped = useMemo(() => {
    const map = new Map<string, CatalogItem[]>();
    for (const i of visible) {
      const key = i.network?.trim() || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(i);
    }
    return [...map.entries()].sort((a, b) => (a[0] === "Other" ? 1 : b[0] === "Other" ? -1 : a[0].localeCompare(b[0])));
  }, [visible]);

  function selectGroup(items: CatalogItem[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const i of items) {
        if (on) next.add(i.id);
        else next.delete(i.id);
      }
      return next;
    });
  }

  const allVisibleSelected = visible.length > 0 && visible.every((i) => selected.has(i.id));

  function toggleAll() {
    setSelected(allVisibleSelected ? new Set() : new Set(visible.map((i) => i.id)));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function savePrice(item: CatalogItem) {
    const draft = priceDrafts[item.id];
    if (draft == null) return;
    const priceMinor = Math.round(Number(draft) * 100);
    if (!Number.isInteger(priceMinor) || priceMinor <= 0) return;
    setSavingId(item.id);
    await fetch(`/api/admin/rates/catalog/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceMinor }),
    });
    setSavingId(null);
    setPriceDrafts((d) => {
      const n = { ...d };
      delete n[item.id];
      return n;
    });
    onReload();
  }

  async function toggleActive(item: CatalogItem) {
    await fetch(`/api/admin/rates/catalog/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !item.active }),
    });
    onReload();
  }

  async function deleteOne(item: CatalogItem) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/rates/catalog/${item.id}`, { method: "DELETE" });
    onReload();
  }

  async function bulk(action: "enable" | "disable" | "delete") {
    if (selected.size === 0) return;
    if (action === "delete" && !confirm(`Delete ${selected.size} plan(s)? This cannot be undone.`)) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/rates/catalog/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), action }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? `${action}: ${data.affected} plan(s).` : data.error ?? "Failed");
    if (res.ok) {
      setSelected(new Set());
      onReload();
    }
  }

  function markupScope() {
    return {
      markupPct: Number(markupPct),
      ...(selected.size > 0
        ? { ids: Array.from(selected) }
        : { serviceType: service === "all" ? undefined : service, vendor: vendor === "all" ? undefined : vendor }),
    };
  }

  async function previewMarkup() {
    setMessage(null);
    const res = await fetch("/api/admin/rates/catalog/markup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...markupScope(), dryRun: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMessage(data.error ?? "Preview failed");
    setPreview({
      count: data.count,
      sample: (data.preview ?? []).slice(0, 3).map(
        (p: { name: string; currency: string; currentPriceMinor: number; newPriceMinor: number }) =>
          `${p.name}: ${money(p.currentPriceMinor, p.currency)} → ${money(p.newPriceMinor, p.currency)}`
      ),
    });
  }

  async function applyMarkup() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/rates/catalog/markup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(markupScope()),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? `Re-priced ${data.updated} item(s) at cost + ${markupPct}%.` : data.error ?? "Failed");
    setPreview(null);
    setSelected(new Set());
    onReload();
  }

  async function onFile(file: File) {
    setImportErrors([]);
    setImportRows(null);
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      setImportErrors([
        "Excel files can't be read directly. In Excel or Google Sheets choose File → Save As / Download → CSV, then upload that.",
      ]);
      return;
    }
    if (lower.endsWith(".pdf")) {
      setImportErrors([
        "PDF price lists are laid out visually and can't be parsed reliably. Export the table to CSV (or paste it into a sheet and save as CSV) and upload that.",
      ]);
      return;
    }
    const text = await file.text();
    const parsed = parsePriceSheet(text, importService);
    setImportErrors(parsed.errors);
    setImportRows(parsed.rows.length ? parsed.rows : null);
  }

  async function runImport() {
    if (!importRows) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/rates/catalog/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendor: importVendor,
        markupPct: Number(markupPct),
        deactivateMissing: replaceMissing,
        rows: importRows.map((r) => ({
          serviceType: r.serviceType,
          externalId: r.externalId,
          name: r.name,
          network: r.network,
          currency: r.currency,
          costMinor: r.costMinor,
          priceMinor: r.priceMinor,
        })),
      }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setImportErrors(data.errors ?? [data.error ?? "Import failed"]);
      return;
    }
    setMessage(
      `Imported ${data.rows} row(s): ${data.created} new, ${data.updated} updated${data.deactivated ? `, ${data.deactivated} retired` : ""}.`
    );
    setImportRows(null);
    setShowImport(false);
    if (fileRef.current) fileRef.current.value = "";
    onReload();
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select value={service} onChange={(e) => setService(e.target.value)} className="rounded-lg border border-border-soft px-2 py-1.5 text-xs">
          <option value="all">All services</option>
          {services.map((s) => (
            <option key={s} value={s}>
              {SERVICE_LABEL[s] ?? s}
            </option>
          ))}
        </select>
        <select value={vendor} onChange={(e) => setVendor(e.target.value)} className="rounded-lg border border-border-soft px-2 py-1.5 text-xs">
          <option value="all">All providers</option>
          {vendors.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, code or network…"
          className="min-w-[180px] flex-1 rounded-lg border border-border-soft px-3 py-1.5 text-xs"
        />
        <button onClick={() => setShowImport((s) => !s)} className="rounded-lg bg-indigo px-3 py-1.5 text-xs font-semibold text-white">
          {showImport ? "Close import" : "Import price sheet"}
        </button>
      </div>

      {/* Bulk markup */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border-soft bg-hover-tint px-3 py-2.5">
        <span className="text-xs font-semibold text-indigo">Re-price</span>
        <span className="text-xs text-text-secondary">
          {selected.size > 0 ? `${selected.size} selected` : `all ${visible.length} shown`} at cost +
        </span>
        <input
          value={markupPct}
          onChange={(e) => {
            setMarkupPct(e.target.value.replace(/[^\d.]/g, ""));
            setPreview(null);
          }}
          className="w-16 rounded-lg border border-border-soft px-2 py-1.5 text-right text-xs"
        />
        <span className="text-xs text-text-secondary">%</span>
        <button onClick={previewMarkup} className="rounded-lg border border-indigo/30 px-3 py-1.5 text-xs font-semibold text-indigo">
          Preview
        </button>
        {preview && (
          <>
            <button
              onClick={applyMarkup}
              disabled={busy}
              className="rounded-lg bg-konek-green px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              Apply to {preview.count}
            </button>
            <span className="text-[11px] text-text-secondary">{preview.sample.join(" · ")}</span>
          </>
        )}
      </div>

      {/* Bulk actions on selection */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-indigo/20 bg-white px-3 py-2.5">
          <span className="text-xs font-semibold text-indigo">{selected.size} selected</span>
          <button onClick={() => bulk("enable")} disabled={busy} className="rounded-lg bg-konek-green/10 px-3 py-1.5 text-xs font-semibold text-konek-green">
            Enable
          </button>
          <button onClick={() => bulk("disable")} disabled={busy} className="rounded-lg bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold">
            Disable
          </button>
          <button onClick={() => bulk("delete")} disabled={busy} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
            Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-text-secondary">
            Clear
          </button>
        </div>
      )}

      {/* Import panel */}
      {showImport && (
        <div className="mb-3 rounded-xl border border-indigo/20 bg-white p-4">
          <p className="mb-1 text-sm font-semibold text-indigo">Import a price sheet</p>
          <p className="mb-3 text-xs text-text-secondary">
            CSV or TSV. Columns are matched by name — <code>service_type, code, name, network, currency, cost, price</code> (aliases like
            sku/slug/plan/buying_price work). Money in naira/dollars. Leave <code>price</code> blank to auto-price at cost + {markupPct}%.
            Excel: save as CSV first. Matching rows update in place.
          </p>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={importVendor}
              onChange={(e) => setImportVendor(e.target.value)}
              placeholder="Provider (vendor)"
              className="w-40 rounded-lg border border-border-soft px-2 py-1.5 text-xs"
            />
            <input
              value={importService}
              onChange={(e) => setImportService(e.target.value)}
              placeholder="Default service type (if not in sheet)"
              className="w-56 rounded-lg border border-border-soft px-2 py-1.5 text-xs"
            />
            <label className="flex items-center gap-1.5 text-xs text-text-secondary">
              <input type="checkbox" checked={replaceMissing} onChange={(e) => setReplaceMissing(e.target.checked)} />
              Retire items missing from the sheet
            </label>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,text/csv,text/tab-separated-values,.xlsx,.xls,.pdf"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            className="text-xs"
          />

          {importErrors.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-red-600">
              {importErrors.slice(0, 8).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}

          {importRows && (
            <div className="mt-3">
              <p className="mb-2 text-xs text-text-secondary">
                Parsed <span className="font-semibold text-indigo">{importRows.length}</span> row(s). First few:
              </p>
              <div className="mb-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-text-secondary">
                    <tr>
                      <th className="py-1 pr-3">Service</th>
                      <th className="py-1 pr-3">Code</th>
                      <th className="py-1 pr-3">Name</th>
                      <th className="py-1 pr-3">Cost</th>
                      <th className="py-1">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-t border-border-soft">
                        <td className="py-1 pr-3">{r.serviceType}</td>
                        <td className="py-1 pr-3">{r.externalId}</td>
                        <td className="py-1 pr-3">{r.name}</td>
                        <td className="py-1 pr-3">{money(r.costMinor, r.currency)}</td>
                        <td className="py-1">
                          {r.priceMinor != null ? money(r.priceMinor, r.currency) : <em className="text-text-secondary">cost + {markupPct}%</em>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={runImport}
                disabled={busy}
                className="rounded-lg bg-konek-green px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Importing…" : `Import ${importRows.length} row(s)`}
              </button>
            </div>
          )}
        </div>
      )}

      {message && <p className="mb-3 text-xs font-semibold text-konek-green">{message}</p>}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-border-soft text-xs uppercase tracking-wide text-text-secondary">
            <tr>
              <th className="w-8 py-2">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all" />
              </th>
              <th className="py-2 pr-3">Product</th>
              <th className="py-2 pr-3">Service</th>
              <th className="py-2 pr-3">Provider</th>
              <th className="py-2 pr-3">Network</th>
              <th className="py-2 pr-3 text-right">Cost</th>
              <th className="py-2 pr-3 text-right">Price</th>
              <th className="py-2 pr-3 text-right">Margin</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {grouped.map(([network, groupItems]) => {
              const groupSelected = groupItems.every((i) => selected.has(i.id));
              return (
                <Fragment key={network}>
                  <tr className="bg-hover-tint">
                    <td className="py-1.5">
                      <input
                        type="checkbox"
                        checked={groupSelected}
                        onChange={() => selectGroup(groupItems, !groupSelected)}
                        aria-label={`Select all ${network}`}
                      />
                    </td>
                    <td colSpan={9} className="py-1.5 text-xs font-bold uppercase tracking-wide text-indigo">
                      {network} <span className="text-text-secondary">· {groupItems.length}</span>
                    </td>
                  </tr>
                  {groupItems.map((item) => {
                    const cost = Number(item.cost_minor);
                    const price = Number(item.price_minor);
                    const m = marginPct(cost, price);
                    const draft = priceDrafts[item.id];
                    return (
                <tr key={item.id} className={`border-b border-border-soft ${item.active ? "" : "opacity-50"}`}>
                  <td className="py-2">
                    <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleOne(item.id)} aria-label={`Select ${item.name}`} />
                  </td>
                  <td className="py-2 pr-3">
                    <p className="font-medium text-indigo">{item.name}</p>
                    <p className="text-[11px] text-text-secondary">{item.external_id}</p>
                  </td>
                  <td className="py-2 pr-3 text-xs">{SERVICE_LABEL[item.service_type] ?? item.service_type}</td>
                  <td className="py-2 pr-3 text-xs">{item.vendor}</td>
                  <td className="py-2 pr-3 text-xs">{item.network ?? "—"}</td>
                  <td className="py-2 pr-3 text-right text-xs tabular-nums">{money(cost, item.currency)}</td>
                  <td className="py-2 pr-3 text-right">
                    <input
                      value={draft ?? (price / 100).toString()}
                      onChange={(e) => setPriceDrafts((d) => ({ ...d, [item.id]: e.target.value.replace(/[^\d.]/g, "") }))}
                      onBlur={() => draft != null && savePrice(item)}
                      className={`w-24 rounded-lg border px-2 py-1 text-right text-xs tabular-nums ${
                        draft != null ? "border-konek-green" : "border-border-soft"
                      }`}
                      disabled={savingId === item.id}
                    />
                  </td>
                  <td
                    className={`py-2 pr-3 text-right text-xs tabular-nums ${
                      m === null ? "text-text-secondary" : m < 0 ? "text-red-600" : m < 5 ? "text-gold" : "text-konek-green"
                    }`}
                  >
                    {m === null ? "—" : `${m.toFixed(0)}%`}
                  </td>
                  <td className="py-2 pr-3">
                    <button
                      onClick={() => toggleActive(item)}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        item.active ? "bg-konek-green/10 text-konek-green" : "bg-red-50 text-red-600"
                      }`}
                    >
                      {item.active ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => onEdit(item)} className="text-xs font-semibold text-indigo hover:underline">
                        Edit
                      </button>
                      <button onClick={() => deleteOne(item)} className="text-xs font-semibold text-red-600 hover:underline">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && <p className="py-6 text-center text-sm text-text-secondary">No catalogue items match these filters.</p>}
      </div>

      <p className="mt-3 text-xs text-text-secondary">
        Showing {visible.length} of {items.length}. Edit a price inline (saves when you click away), or select rows to bulk re-price.
      </p>
    </div>
  );
}
