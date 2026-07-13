import { query } from "@/lib/db";
import { VendorAdapter, VendorServiceType } from "./types";
import { mockVtuAdapter } from "./mockVtu";

// Add real aggregators here as they're wired up (e.g. reloadly, vtu_ng).
// Which one actually gets used for a given purchase is decided by
// selectVendor() below, never by an inline choice at the call site.
const ADAPTERS: Record<string, VendorAdapter> = {
  [mockVtuAdapter.id]: mockVtuAdapter,
};

const SERVICE_TYPE_TO_VENDOR_KIND: Record<VendorServiceType, string> = {
  airtime: "vtu",
  data: "vtu",
  cable: "vtu",
  electricity: "vtu",
  exam_pin: "vtu",
  betting: "vtu",
};

export class NoHealthyVendorError extends Error {
  constructor(kind: string) {
    super(`No healthy vendor available for kind=${kind}`);
    this.name = "NoHealthyVendorError";
  }
}

// Picks the highest-priority healthy vendor row for this service type, and
// falls through to the next one if its adapter isn't registered — this is
// the failover path Week 6 exercises with a second real aggregator.
export async function selectVendor(serviceType: VendorServiceType): Promise<VendorAdapter> {
  const kind = SERVICE_TYPE_TO_VENDOR_KIND[serviceType];

  const { rows } = await query<{ id: string }>(
    `SELECT id FROM vendors WHERE kind = $1 AND healthy = true ORDER BY priority ASC`,
    [kind]
  );

  for (const row of rows) {
    const adapter = ADAPTERS[row.id];
    if (adapter) return adapter;
  }

  throw new NoHealthyVendorError(kind);
}

export async function refreshVendorHealth(): Promise<void> {
  for (const adapter of Object.values(ADAPTERS)) {
    const healthy = await adapter.health();
    await query(
      `UPDATE vendors SET healthy = $2, last_health_check = now() WHERE id = $1`,
      [adapter.id, healthy]
    );
  }
}
