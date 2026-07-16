import { query } from "@/lib/db";

export interface VendorMonitoringRow {
  id: string;
  kind: string;
  priority: number;
  healthy: boolean;
  last_health_check: string | null;
  last_health_latency_ms: number | null;
  txn_count_24h: number;
  delivered_count_24h: number;
  failed_count_24h: number;
  success_rate_pct_24h: number | null; // null = no transactions in the window, not "0% success"
}

export interface VendorHealthCheckEvent {
  vendor: string;
  healthy: boolean;
  latencyMs: number | null;
  createdAt: string;
}

// Real per-vendor success rate from actual transaction outcomes, not a
// vanity number — delivered vs failed over the trailing 24h. Vendors with
// no traffic in the window report null (not 0%) so the UI can show
// "no data" instead of implying an outage.
export async function getVendorMonitoring(): Promise<VendorMonitoringRow[]> {
  const { rows } = await query<{
    id: string;
    kind: string;
    priority: number;
    healthy: boolean;
    last_health_check: string | null;
    last_health_latency_ms: number | null;
    txn_count_24h: string;
    delivered_count_24h: string;
    failed_count_24h: string;
  }>(
    `SELECT
       v.id, v.kind, v.priority, v.healthy, v.last_health_check, v.last_health_latency_ms,
       COUNT(t.id) FILTER (WHERE t.status IN ('delivered', 'failed')) AS txn_count_24h,
       COUNT(t.id) FILTER (WHERE t.status = 'delivered') AS delivered_count_24h,
       COUNT(t.id) FILTER (WHERE t.status = 'failed') AS failed_count_24h
     FROM vendors v
     LEFT JOIN transactions t ON t.vendor = v.id AND t.created_at >= now() - interval '24 hours'
     GROUP BY v.id, v.kind, v.priority, v.healthy, v.last_health_check, v.last_health_latency_ms
     ORDER BY v.kind, v.priority`
  );

  return rows.map((r) => {
    const txnCount = Number(r.txn_count_24h);
    const delivered = Number(r.delivered_count_24h);
    const failed = Number(r.failed_count_24h);
    return {
      id: r.id,
      kind: r.kind,
      priority: r.priority,
      healthy: r.healthy,
      last_health_check: r.last_health_check,
      last_health_latency_ms: r.last_health_latency_ms,
      txn_count_24h: txnCount,
      delivered_count_24h: delivered,
      failed_count_24h: failed,
      success_rate_pct_24h: txnCount > 0 ? Math.round((delivered / txnCount) * 100) : null,
    };
  });
}

export async function getVendorHealthHistory(vendorId: string, limit = 20): Promise<VendorHealthCheckEvent[]> {
  const { rows } = await query<{ entity_id: string; detail: { healthy: boolean; latencyMs: number } | null; created_at: string }>(
    `SELECT entity_id, detail, created_at FROM audit_log
     WHERE action = 'vendor_health_check' AND entity_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [vendorId, limit]
  );
  return rows.map((r) => ({
    vendor: r.entity_id,
    healthy: r.detail?.healthy ?? false,
    latencyMs: r.detail?.latencyMs ?? null,
    createdAt: r.created_at,
  }));
}
