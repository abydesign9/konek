// Supplier selection + failover. For one catalog product there are N supplier
// SKUs; this ranks them into the order we'll try at checkout. The customer never
// sees which supplier fulfilled the order.
//
// Priority (as specified):
//   1. Manual supplier override (recommendedSupplierId) — always first if usable
//   2. Cheapest cost
//   3. Highest success rate
//   4. Fastest API
//   5. Preferred/priority supplier
//   6. Default (stable id tiebreak)
//
// Only in-stock, active, non-down suppliers are eligible; the ranked list is the
// failover chain (try #1, on failure try #2, …).

export interface SupplierOption {
  supplierProductId: string;
  supplierId: string;
  supplierSku: string;
  costMinor: number;
  currency: string;
  stockStatus: string; // in_stock | out_of_stock | unknown
  apiStatus: string; // ok | degraded | down
  active: boolean;
  purchasePriority: number; // lower = preferred
  // Supplier-level health (from the vendors row / provider metrics):
  successRate: number | null; // 0..1
  averageResponseMs: number | null;
  supplierEnabled: boolean;
  supplierHealthy: boolean;
  circuitOpen: boolean;
}

export interface SelectionContext {
  recommendedSupplierId?: string | null; // manual override on the catalog product
}

function eligible(o: SupplierOption): boolean {
  return (
    o.active &&
    o.supplierEnabled &&
    o.supplierHealthy &&
    !o.circuitOpen &&
    o.apiStatus !== "down" &&
    o.stockStatus !== "out_of_stock"
  );
}

export interface SelectionResult {
  chain: SupplierOption[]; // failover order, best first
  chosen: SupplierOption | null; // chain[0]
  ineligible: SupplierOption[]; // filtered out (for admin visibility)
}

export function selectSuppliers(options: SupplierOption[], ctx: SelectionContext = {}): SelectionResult {
  const usable = options.filter(eligible);
  const ineligible = options.filter((o) => !eligible(o));

  const scored = [...usable].sort((a, b) => {
    // 1. Manual override wins outright.
    const aPin = ctx.recommendedSupplierId && a.supplierId === ctx.recommendedSupplierId ? 1 : 0;
    const bPin = ctx.recommendedSupplierId && b.supplierId === ctx.recommendedSupplierId ? 1 : 0;
    if (aPin !== bPin) return bPin - aPin;

    // 2. Cheapest cost.
    if (a.costMinor !== b.costMinor) return a.costMinor - b.costMinor;

    // 3. Highest success rate (unknown treated as neutral 0.5 so a brand-new
    //    supplier isn't punished harder than a known-bad one).
    const as = a.successRate ?? 0.5;
    const bs = b.successRate ?? 0.5;
    if (as !== bs) return bs - as;

    // 4. Fastest API (unknown sorts last).
    const al = a.averageResponseMs ?? Number.MAX_SAFE_INTEGER;
    const bl = b.averageResponseMs ?? Number.MAX_SAFE_INTEGER;
    if (al !== bl) return al - bl;

    // 5. Preferred supplier (lower purchase_priority).
    if (a.purchasePriority !== b.purchasePriority) return a.purchasePriority - b.purchasePriority;

    // 6. Deterministic default.
    return a.supplierId.localeCompare(b.supplierId);
  });

  return { chain: scored, chosen: scored[0] ?? null, ineligible };
}

export const MAX_FAILOVER_ATTEMPTS = 3;

// The chain we actually try, capped by the retry limit.
export function failoverChain(options: SupplierOption[], ctx: SelectionContext = {}): SupplierOption[] {
  return selectSuppliers(options, ctx).chain.slice(0, MAX_FAILOVER_ATTEMPTS);
}
