import { query } from "@/lib/db";
import { sendExternalAlert } from "@/lib/alerts/externalAlert";
import { logAudit } from "@/lib/audit";
import { VendorAdapter, VendorServiceType } from "./types";
import { mockVtuAdapter, mockVtuAdapter2 } from "./mockVtu";

// Add real aggregators here as they're wired up (e.g. reloadly, vtu_ng).
// Which one actually gets used for a given purchase is decided by
// selectVendor() below, never by an inline choice at the call site.
const ADAPTERS: Record<string, VendorAdapter> = {
  [mockVtuAdapter.id]: mockVtuAdapter,
  [mockVtuAdapter2.id]: mockVtuAdapter2,
};

const SERVICE_TYPE_TO_VENDOR_KIND: Record<VendorServiceType, string> = {
  airtime: "vtu",
  data: "vtu",
  cable: "vtu",
  electricity: "vtu",
  exam_pin: "vtu",
  betting: "vtu",
  gift_card: "vtu",
  intl_topup: "vtu",
  esim: "vtu",
};

export class NoHealthyVendorError extends Error {
  constructor(kind: string) {
    super(`No healthy vendor available for kind=${kind}`);
    this.name = "NoHealthyVendorError";
  }
}

// Picks the highest-priority healthy vendor row for this service type, and
// falls through to the next one if its adapter isn't registered. Health and
// priority live in the `vendors` table, so an ops toggle (or a failed
// health check) immediately reroutes future purchases — no deploy needed.
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

// Called on every /api/cron/tick (see src/app/api/cron/tick) and from the
// Provider Monitoring page's manual "Run check now". Measures latency
// around each adapter's health() call, persists it alongside healthy/
// last_health_check, and appends a system audit_log row per check —
// that log is the health-check history the monitoring page reads, rather
// than a bespoke table.
export async function refreshVendorHealth(): Promise<void> {
  for (const adapter of Object.values(ADAPTERS)) {
    const { rows: before } = await query<{ healthy: boolean }>(`SELECT healthy FROM vendors WHERE id = $1`, [adapter.id]);

    const startedAt = Date.now();
    const healthy = await adapter.health();
    const latencyMs = Date.now() - startedAt;

    await query(
      `UPDATE vendors SET healthy = $2, last_health_check = now(), last_health_latency_ms = $3 WHERE id = $1`,
      [adapter.id, healthy, latencyMs]
    );
    await logAudit("system:cron", "vendor_health_check", "vendor", adapter.id, { healthy, latencyMs });

    if (before[0]?.healthy && !healthy) {
      await sendExternalAlert("provider_outage", `${adapter.id} failed automated health check`, { vendor: adapter.id });
    }
  }
}
