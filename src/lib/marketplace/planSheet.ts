// Parse a supplier's eSIM price sheet (CSV/TSV) into SupplierPlanInput rows for
// the marketplace import. Columns are matched by name with aliases so each
// supplier's export format works without renaming. Money is in major units
// (dollars) -> cents. Runs in the browser; no dependency.
import type { SupplierPlanInput } from "./import";

const ALIASES: Record<string, string[]> = {
  sku: ["sku", "code", "package_code", "packagecode", "plan_code", "slug", "id", "external_id"],
  name: ["name", "plan", "plan_name", "title", "description"],
  country: ["country", "country_code", "location", "locationcode", "iso"],
  region: ["region", "area", "zone"],
  operator: ["operator", "carrier", "network_operator"],
  data: ["data", "data_amount", "volume", "size", "gb", "mb"],
  dataUnit: ["data_unit", "unit"],
  validity: ["validity", "days", "duration", "period", "valid"],
  networkType: ["network", "network_type", "speed", "tech"],
  cost: ["cost", "cost_price", "buy", "buying_price", "wholesale", "price", "supplier_cost"],
  currency: ["currency", "ccy"],
  stock: ["stock", "stock_status", "availability", "in_stock"],
};

function norm(h: string): string {
  return h.trim().toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function idx(headers: string[], key: keyof typeof ALIASES): number {
  return headers.findIndex((h) => ALIASES[key].includes(h));
}

function split(line: string, d: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          q = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      q = true;
    } else if (c === d) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function costToCents(raw: string): number | null {
  const n = Number(raw.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

export interface PlanParseResult {
  rows: SupplierPlanInput[];
  errors: string[];
}

// ---- Manual column mapping (email-marketing-style import) ----------------
// When a supplier's sheet uses column names we don't recognise, the admin maps
// each field to a column by hand. These helpers power that flow.

export const MAP_FIELDS = [
  { key: "sku", label: "Plan code / SKU", required: true },
  { key: "cost", label: "Cost price", required: true },
  { key: "data", label: "Data amount", required: true },
  { key: "validity", label: "Validity", required: true },
  { key: "name", label: "Plan name", required: false },
  { key: "country", label: "Country", required: false },
  { key: "region", label: "Region", required: false },
  { key: "operator", label: "Operator", required: false },
  { key: "dataUnit", label: "Data unit (GB/MB)", required: false },
  { key: "networkType", label: "Network type", required: false },
  { key: "currency", label: "Currency", required: false },
  { key: "stock", label: "Stock status", required: false },
] as const;

export type MapField = (typeof MAP_FIELDS)[number]["key"];
export type ColumnMapping = Record<MapField, number>; // -1 = unmapped

export interface RawSheet {
  headers: string[];
  rows: string[][];
}

// Split a sheet into original headers + raw rows without requiring any known
// columns — so the mapping UI can show whatever the supplier gave us.
export function parseRawSheet(text: string): RawSheet {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const delim = lines[0].includes("\t") ? "\t" : ",";
  const headers = split(lines[0], delim);
  const rows = lines.slice(1).map((l) => split(l, delim));
  return { headers, rows };
}

// Best-guess mapping from header names, used to pre-fill the mapping UI.
export function suggestMapping(headers: string[]): ColumnMapping {
  const normed = headers.map(norm);
  const m = {} as ColumnMapping;
  for (const f of MAP_FIELDS) {
    m[f.key] = normed.findIndex((h) => (ALIASES[f.key] ?? []).includes(h));
  }
  return m;
}

// Build plan rows from an explicit column mapping.
export function buildPlansFromMapping(
  sheet: RawSheet,
  map: ColumnMapping,
  defaults: { currency?: string } = {}
): PlanParseResult {
  const errors: string[] = [];
  const at = (row: string[], key: MapField) => (map[key] >= 0 ? (row[map[key]] ?? "").trim() : "");
  const rows: SupplierPlanInput[] = [];

  sheet.rows.forEach((c, i) => {
    const line = i + 2;
    const sku = at(c, "sku");
    if (!sku) return;
    const cost = costToCents(at(c, "cost"));
    if (cost == null || cost <= 0) {
      errors.push(`Line ${line}: invalid cost`);
      return;
    }
    rows.push({
      sku,
      costMinor: cost,
      currency: at(c, "currency") || defaults.currency || "USD",
      stockStatus: map.stock >= 0 ? (/(out|0|no)/i.test(at(c, "stock")) ? "out_of_stock" : "in_stock") : "in_stock",
      country: map.country >= 0 ? at(c, "country") : null,
      region: map.region >= 0 ? at(c, "region") : null,
      operator: map.operator >= 0 ? at(c, "operator") : null,
      data: map.data >= 0 ? at(c, "data") : undefined,
      dataUnit: map.dataUnit >= 0 ? at(c, "dataUnit") : undefined,
      validity: map.validity >= 0 ? at(c, "validity") : undefined,
      validityUnit: "DAY",
      networkType: map.networkType >= 0 ? at(c, "networkType") : null,
      category: "esim",
      raw: { line: c },
    });
  });

  return { rows, errors };
}

export function parsePlanSheet(text: string, defaults: { currency?: string } = {}): PlanParseResult {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], errors: ["Need a header row and at least one data row."] };

  const delim = lines[0].includes("\t") ? "\t" : ",";
  const h = split(lines[0], delim).map(norm);
  const col = {
    sku: idx(h, "sku"),
    name: idx(h, "name"),
    country: idx(h, "country"),
    region: idx(h, "region"),
    operator: idx(h, "operator"),
    data: idx(h, "data"),
    dataUnit: idx(h, "dataUnit"),
    validity: idx(h, "validity"),
    networkType: idx(h, "networkType"),
    cost: idx(h, "cost"),
    currency: idx(h, "currency"),
    stock: idx(h, "stock"),
  };

  if (col.sku === -1) errors.push("Missing a code column (sku / package_code / slug).");
  if (col.data === -1) errors.push("Missing a data column (data / volume / size).");
  if (col.validity === -1) errors.push("Missing a validity column (validity / days / duration).");
  if (col.cost === -1) errors.push("Missing a cost column (cost / buying_price / price).");
  if (errors.length) return { rows: [], errors };

  const rows: SupplierPlanInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = split(lines[i], delim);
    const line = i + 1;
    const sku = (c[col.sku] ?? "").trim();
    if (!sku) continue;

    const cost = costToCents(c[col.cost] ?? "");
    if (cost == null || cost <= 0) {
      errors.push(`Line ${line}: invalid cost`);
      continue;
    }

    rows.push({
      sku,
      costMinor: cost,
      currency: (col.currency >= 0 ? c[col.currency] : "") || defaults.currency || "USD",
      stockStatus: col.stock >= 0 ? (/(out|0|no)/i.test(c[col.stock] ?? "") ? "out_of_stock" : "in_stock") : "in_stock",
      country: col.country >= 0 ? c[col.country] : null,
      region: col.region >= 0 ? c[col.region] : null,
      operator: col.operator >= 0 ? c[col.operator] : null,
      data: col.data >= 0 ? c[col.data] : undefined,
      dataUnit: col.dataUnit >= 0 ? c[col.dataUnit] : undefined,
      validity: col.validity >= 0 ? c[col.validity] : undefined,
      validityUnit: "DAY",
      networkType: col.networkType >= 0 ? c[col.networkType] : null,
      category: "esim",
      raw: { line: c },
    });
  }

  return { rows, errors };
}
