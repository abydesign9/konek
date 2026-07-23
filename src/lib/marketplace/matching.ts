// Auto-matching: turns each supplier's plan into a normalised identity so that
// "Nigeria MTN 1GB 7 Days" from eSIMGo, Airalo, BNESIM and Roamify all resolve to
// ONE catalog product instead of four near-duplicate listings.
//
// The fingerprint is the join key. It must be stable across suppliers who write
// the same plan very differently ("1 GB", "1024MB", "1GB"; "7 Days", "7d",
// "1 Week"; "MTN Nigeria", "mtn"), and it must NOT collapse genuinely different
// plans (5G vs 4G, regional vs country).

export interface RawSupplierPlan {
  country?: string | null; // "NG" | "Nigeria" | null for region/global
  region?: string | null; // "Europe" | "Global"
  operator?: string | null; // "MTN"
  data?: string | number | null; // "1GB" | 1024 (with dataUnit) | "Unlimited"
  dataUnit?: string | null; // "GB" | "MB"
  validity?: string | number | null; // "7 Days" | 7 | "1 Week"
  validityUnit?: string | null; // "DAY"
  networkType?: string | null; // "4G" | "5G" | "3G/4G"
  category?: string | null; // "esim"
}

export interface NormalisedPlan {
  fingerprint: string;
  country: string | null;
  region: string | null;
  operator: string | null;
  dataAmount: number; // always stored in GB (3dp); -1 means unlimited
  dataUnit: "GB";
  validity: number; // always stored in days
  validityUnit: "DAY";
  networkType: string | null;
  category: string;
}

// Minimal ISO country map for the names suppliers actually send. Unknown names
// pass through upper-cased rather than being dropped, so nothing silently merges.
const COUNTRY_ALIASES: Record<string, string> = {
  nigeria: "NG",
  ghana: "GH",
  kenya: "KE",
  southafrica: "ZA",
  unitedstates: "US",
  usa: "US",
  unitedstatesofamerica: "US",
  unitedkingdom: "GB",
  uk: "GB",
  greatbritain: "GB",
  canada: "CA",
  france: "FR",
  germany: "DE",
  spain: "ES",
  italy: "IT",
  china: "CN",
  japan: "JP",
  india: "IN",
  uae: "AE",
  unitedarabemirates: "AE",
  saudiarabia: "SA",
  turkey: "TR",
  egypt: "EG",
  brazil: "BR",
  mexico: "MX",
  australia: "AU",
  singapore: "SG",
  slovenia: "SI",
};

function squash(v: unknown): string {
  return String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function normaliseCountry(input?: string | null): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  // Multi-country lists belong to a region product, not a country one.
  if (raw.includes(",")) return null;
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  return COUNTRY_ALIASES[squash(raw)] ?? raw.toUpperCase();
}

// "MTN Nigeria" / "mtn" / "MTN-NG" -> "MTN". Empty means "any operator".
export function normaliseOperator(input?: string | null): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const cleaned = raw
    .replace(/\b(nigeria|ghana|kenya|network|telecom|mobile|ng)\b/gi, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  return cleaned || null;
}

// Everything becomes GB so 1024MB and 1GB match. -1 = unlimited.
export function normaliseData(value?: string | number | null, unit?: string | null): number {
  if (value == null || value === "") return 0;
  const asString = String(value).trim();
  if (/unlimited|unltd|∞/i.test(asString)) return -1;

  const match = asString.match(/([\d.]+)\s*(TB|GB|MB|KB)?/i);
  if (!match) return 0;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return 0;

  const explicit = (match[2] ?? unit ?? "GB").toUpperCase();
  const gb =
    explicit === "TB" ? amount * 1024 : explicit === "MB" ? amount / 1024 : explicit === "KB" ? amount / (1024 * 1024) : amount;
  // 3dp keeps 500MB (0.488GB) distinct without float noise breaking equality.
  return Math.round(gb * 1000) / 1000;
}

// "7 Days" / "7d" / "1 Week" / "1 Month" -> days.
export function normaliseValidity(value?: string | number | null, unit?: string | null): number {
  if (value == null || value === "") return 0;
  const asString = String(value).trim();
  const match = asString.match(/([\d.]+)\s*([a-zA-Z]*)/);
  if (!match) return 0;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return 0;

  const raw = (match[2] || unit || "day").toLowerCase();
  const perUnit = raw.startsWith("y") ? 365 : raw.startsWith("mo") || raw === "m" ? 30 : raw.startsWith("w") ? 7 : raw.startsWith("h") ? 1 / 24 : 1;
  return Math.round(amount * perUnit);
}

// "3G/4G" / "LTE" / "4g" -> "4G". Kept in the fingerprint because a 5G plan is a
// different product to a 4G one at a different price.
export function normaliseNetworkType(input?: string | null): string | null {
  const raw = String(input ?? "").trim().toUpperCase();
  if (!raw) return null;
  if (raw.includes("5G")) return "5G";
  if (raw.includes("4G") || raw.includes("LTE")) return "4G";
  if (raw.includes("3G")) return "3G";
  return raw;
}

export function normaliseRegion(input?: string | null): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  return raw.replace(/\s+/g, " ").toUpperCase();
}

// The matching key. Country/region are mutually exclusive: a plan is either a
// country pack or a regional/global one, so a "Europe 1GB" never merges with a
// "France 1GB".
export function normalisePlan(raw: RawSupplierPlan): NormalisedPlan {
  const country = normaliseCountry(raw.country);
  const region = country ? null : normaliseRegion(raw.region) ?? (raw.country?.includes(",") ? "MULTI" : null);
  const operator = normaliseOperator(raw.operator);
  const dataAmount = normaliseData(raw.data, raw.dataUnit);
  const validity = normaliseValidity(raw.validity, raw.validityUnit);
  const networkType = normaliseNetworkType(raw.networkType);
  const category = (raw.category ?? "esim").toLowerCase();

  const fingerprint = [
    category,
    country ?? `rg:${region ?? "GLOBAL"}`,
    operator ?? "any",
    dataAmount === -1 ? "unlimited" : dataAmount.toFixed(3),
    `${validity}d`,
    networkType ?? "any",
  ].join("|");

  return { fingerprint, country, region, operator, dataAmount, dataUnit: "GB", validity, validityUnit: "DAY", networkType, category };
}

// Human label for a matched product, e.g. "Nigeria · MTN · 1GB · 7 days".
export function displayNameFor(p: NormalisedPlan): string {
  const where = p.country ?? p.region ?? "Global";
  const data = p.dataAmount === -1 ? "Unlimited" : p.dataAmount >= 1 ? `${p.dataAmount}GB` : `${Math.round(p.dataAmount * 1024)}MB`;
  return [where, p.operator, data, `${p.validity} days`].filter(Boolean).join(" · ");
}
