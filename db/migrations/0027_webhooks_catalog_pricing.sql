-- ============================================================
-- Raviion — Migration 0027: generic webhooks + catalog sync + margin protection
--                          + provider maintenance state
--
-- Backend for M3 installment 2. Additive only.
--   * webhook_events gains the fields a generic, replayable framework needs.
--   * catalog_sync_runs records every sync (counts, duration, failures).
--   * catalog_items gains pricing controls (manual price lock, promo price,
--     previous cost) so selling price stays independent of provider cost.
--   * pricing_rules holds markup + fail-closed minimum-margin config.
--   * vendors gains a maintenance flag for the provider state machine.
-- ============================================================

-- ---------- Webhook framework ----------
ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS event_type    text,
  ADD COLUMN IF NOT EXISTS reference     text,
  ADD COLUMN IF NOT EXISTS headers       jsonb,
  ADD COLUMN IF NOT EXISTS status        text NOT NULL DEFAULT 'received'
       CHECK (status IN ('received','processing','processed','failed','rejected')),
  ADD COLUMN IF NOT EXISTS retry_count   int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS result        jsonb,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;

-- The replay worker scans failed events by age; partial index keeps it cheap.
CREATE INDEX IF NOT EXISTS idx_webhook_events_failed
  ON webhook_events (received_at) WHERE status = 'failed';
CREATE INDEX IF NOT EXISTS idx_webhook_events_vendor_ref
  ON webhook_events (vendor, reference);

-- ---------- Catalog sync history ----------
CREATE TABLE IF NOT EXISTS catalog_sync_runs (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor               text NOT NULL,
  status               text NOT NULL CHECK (status IN ('completed','failed','partial')),
  plans_upserted       int NOT NULL DEFAULT 0,
  plans_deactivated    int NOT NULL DEFAULT 0,
  plans_skipped_margin int NOT NULL DEFAULT 0,
  duration_ms          int,
  error                text,
  started_at           timestamptz NOT NULL DEFAULT now(),
  finished_at          timestamptz
);
CREATE INDEX IF NOT EXISTS idx_catalog_sync_runs_vendor ON catalog_sync_runs (vendor, started_at DESC);

-- ---------- Independent selling price on catalog_items ----------
ALTER TABLE catalog_items
  ADD COLUMN IF NOT EXISTS price_locked      boolean NOT NULL DEFAULT false, -- manual price; sync won't overwrite it
  ADD COLUMN IF NOT EXISTS promo_price_minor bigint,                          -- future promotional pricing
  ADD COLUMN IF NOT EXISTS last_cost_minor   bigint;                          -- previous provider cost (audit/margin)

-- ---------- Markup + fail-closed margin rules ----------
CREATE TABLE IF NOT EXISTS pricing_rules (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_type   text UNIQUE,                       -- NULL row = platform default
  markup_bps     int NOT NULL DEFAULT 0 CHECK (markup_bps >= 0),      -- basis points added over cost -> selling price
  min_margin_bps int NOT NULL DEFAULT 0 CHECK (min_margin_bps >= 0),  -- fail-closed floor on gross margin
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Sensible default: 5% markup, never sell below a 2% gross margin.
INSERT INTO pricing_rules (service_type, markup_bps, min_margin_bps)
  VALUES (NULL, 500, 200)
ON CONFLICT (service_type) DO NOTHING;

-- ---------- Provider maintenance flag (state machine) ----------
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS maintenance boolean NOT NULL DEFAULT false;
