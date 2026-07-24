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
