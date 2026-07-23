// Price-sheet parsing for the admin catalogue importer.
//
// CSV/TSV is parsed here in the browser (no dependency, no upload endpoint), and
// the normalised rows are posted to /api/admin/rates/catalog/import.
//
// Excel: .xlsx is a zipped XML format that can't be read without a heavy
// third-party parser, so the console asks for "Save As -> CSV" (one click in
// Excel/Sheets) rather than shipping one. PDF price lists are laid out
// visually and can't be parsed reliably at all — same advice.

export interface ParsedRow {
  serviceType: string;
  externalId: string;
  name: string;
  network: string;
  currency: string;
  costMinor: number;
  priceMinor: number | null; // null -> derive from cost using the markup
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: string[];
  headers: string[];
}

// Header aliases so a finance sheet doesn't have to match our column names exactly.
const ALIASES: Record<string, string[]> = {
  serviceType: ["service_type", "service", "servicetype", "product", "category"],
  externalId: ["external_id", "externalid", "code", "plan_code", "package_code", "sku", "slug", "id"],
  name: ["name", "plan", "plan_name", "description", "package", "title"],
  network: ["network", "provider", "brand", "operator", "carrier", "disco", "biller"],
  currency: ["currency", "ccy"],
  cost: ["cost", "cost_price", "buy", "buying_price", "wholesale", "amount", "our_cost"],
  price: ["price", "sell", "selling_price", "retail", "retail_price", "customer_price"],
};

function normaliseHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function findIndex(headers: string[], key: keyof typeof ALIASES): number {
  const candidates = ALIASES[key];
  return headers.findIndex((h) => candidates.includes(h));
}

// Minimal RFC-4180-ish splitter: handles quoted fields and escaped quotes.
function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

// Money in the sheet is written in MAJOR units (₦1,500.50 / $11.25) — that's what
// a finance team types — so convert to the minor units the ledger stores.
function toMinor(raw: string): number | null {
  const cleaned = raw.replace(/[₦$,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function parsePriceSheet(text: string, defaultServiceType = ""): ParseResult {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { rows: [], errors: ["The file needs a header row and at least one data row."], headers: [] };

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = splitLine(lines[0], delimiter).map(normaliseHeader);

  const idx = {
    serviceType: findIndex(headers, "serviceType"),
    externalId: findIndex(headers, "externalId"),
    name: findIndex(headers, "name"),
    network: findIndex(headers, "network"),
    currency: findIndex(headers, "currency"),
    cost: findIndex(headers, "cost"),
    price: findIndex(headers, "price"),
  };

  if (idx.externalId === -1) errors.push("Missing a code column (external_id / code / sku / slug).");
  if (idx.name === -1) errors.push("Missing a name column (name / plan / description).");
  if (idx.cost === -1 && idx.price === -1) errors.push("Missing a cost or price column.");
  if (idx.serviceType === -1 && !defaultServiceType) {
    errors.push("Missing a service_type column — add one, or pick a service type above.");
  }
  if (errors.length) return { rows: [], errors, headers };

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i], delimiter);
    const line = i + 1;

    const externalId = (cells[idx.externalId] ?? "").trim();
    const name = (cells[idx.name] ?? "").trim();
    if (!externalId && !name) continue; // blank row

    const serviceType = (idx.serviceType >= 0 ? cells[idx.serviceType] : "")?.trim() || defaultServiceType;
    const cost = idx.cost >= 0 ? toMinor(cells[idx.cost] ?? "") : null;
    const price = idx.price >= 0 ? toMinor(cells[idx.price] ?? "") : null;

    if (!serviceType) {
      errors.push(`Line ${line}: no service type`);
      continue;
    }
    if (!externalId) {
      errors.push(`Line ${line}: no code`);
      continue;
    }
    if (!name) {
      errors.push(`Line ${line}: no name`);
      continue;
    }
    if (cost == null && price == null) {
      errors.push(`Line ${line}: no usable cost or price`);
      continue;
    }

    rows.push({
      serviceType,
      externalId,
      name,
      network: (idx.network >= 0 ? cells[idx.network] : "")?.trim() ?? "",
      currency: ((idx.currency >= 0 ? cells[idx.currency] : "") || "NGN").trim().toUpperCase(),
      // If only a price was given, treat it as the cost basis too so margin maths stays sane.
      costMinor: cost ?? price ?? 0,
      priceMinor: price,
    });
  }

  return { rows, errors, headers };
}
