-- ============================================================
-- KONEK — Migration 0026: provider observability + routing controls
--
-- Groundwork for real VTU/provider integrations, built BEFORE any live vendor:
--   * provider_metrics — one row per external provider call (latency, outcome,
--     timeout, http status). Health + txn-level success rate already exist
--     (0018 + vendorMonitoring); this adds the missing per-call dimension so we
--     can compute latency percentiles, timeout rate and failure rate.
--   * vendors routing controls — an ops kill-switch, a float threshold below
--     which a vendor is skipped, and a relative cost weight for routing.
--
-- Additive only.
-- ============================================================

CREATE TABLE IF NOT EXISTS provider_metrics (
  id          bigserial PRIMARY KEY,
  provider    text NOT NULL,
  operation   text NOT NULL,   -- purchase|verify|balance|health|catalog|other
  outcome     text NOT NULL CHECK (outcome IN ('success','failure','timeout','circuit_open')),
  latency_ms  integer,
  http_status integer,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- The monitoring aggregation scans a provider's recent calls by time window.
CREATE INDEX IF NOT EXISTS idx_provider_metrics_provider_time
  ON provider_metrics (provider, created_at DESC);

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS enabled               boolean NOT NULL DEFAULT true,  -- ops kill switch, independent of health
  ADD COLUMN IF NOT EXISTS float_threshold_minor bigint  NOT NULL DEFAULT 0,     -- min float to be routable
  ADD COLUMN IF NOT EXISTS cost_weight           numeric NOT NULL DEFAULT 1;     -- relative cost factor for routing (lower = cheaper)
