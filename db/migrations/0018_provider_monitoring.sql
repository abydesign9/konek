-- ============================================================
-- KONEK — Migration 0018: Provider Monitoring
-- Vendor health checks have run since 0001 (vendors.healthy,
-- last_health_check) but latency was never captured and nothing built a
-- real ops page on top of it. Adds the one missing column; the health
-- history itself lives in audit_log (actor='system:cron', action=
-- 'vendor_health_check') rather than a new table, per the existing
-- "every state change goes to audit_log" convention.
-- ============================================================

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS last_health_latency_ms integer;

-- Provider Monitoring's success-rate panel aggregates transactions by
-- vendor over a recent window — this is a real repeated query pattern,
-- not a one-off, so it earns an index.
CREATE INDEX IF NOT EXISTS idx_txn_vendor_created ON transactions (vendor, created_at DESC) WHERE vendor IS NOT NULL;
