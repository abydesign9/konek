import { VendorPlan } from "./types";

// Normalizes a provider's raw plan objects into internal VendorPlan shape via a
// declarative field map — so a new provider's catalog is wired up with a mapping
// config, not bespoke parsing code. Pure and testable; no provider assumptions.

export type RawPlan = Record<string, unknown>;
type Accessor<T> = string | ((r: RawPlan) => T);

export interface PlanFieldMap {
  externalId: Accessor<string>;
  name: Accessor<string>;
  network: Accessor<string>;
  costMinor: Accessor<number>; // MUST yield integer minor units (use toMinor for decimals)
  priceMinor?: Accessor<number>; // optional — catalog sync derives selling price via markup if absent
  currency?: Accessor<string>;
  meta?: (r: RawPlan) => Record<string, unknown>;
}

// Converts a decimal major-unit amount (e.g. "150.00" naira) to integer minor
// units (15000 kobo). Never store the float.
export function toMinor(amount: number | string, decimals = 2): number {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) throw new Error(`toMinor: non-numeric amount ${String(amount)}`);
  return Math.round(n * 10 ** decimals);
}

function read<T>(raw: RawPlan, acc: Accessor<T>): T {
  return typeof acc === "function" ? acc(raw) : (raw[acc] as T);
}

export function normalizePlan(raw: RawPlan, map: PlanFieldMap, defaults: { currency: string }): VendorPlan {
  const costMinor = read<number>(raw, map.costMinor);
  const priceMinor = map.priceMinor ? read<number>(raw, map.priceMinor) : 0;
  if (!Number.isInteger(costMinor) || costMinor < 0) {
    throw new Error(`normalizePlan: costMinor must be a non-negative integer, got ${String(costMinor)}`);
  }
  return {
    externalId: String(read<string>(raw, map.externalId)),
    name: String(read<string>(raw, map.name)),
    network: String(read<string>(raw, map.network)),
    costMinor,
    priceMinor,
    currency: map.currency ? String(read<string>(raw, map.currency)) : defaults.currency,
    meta: map.meta ? map.meta(raw) : undefined,
  };
}

export function normalizePlans(raws: RawPlan[], map: PlanFieldMap, defaults: { currency: string }): VendorPlan[] {
  return raws.map((r) => normalizePlan(r, map, defaults));
}
