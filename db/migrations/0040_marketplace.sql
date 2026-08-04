-- ============================================================
-- KONEK — Migration 0040: multi-supplier digital product marketplace
--
-- Separates what the CUSTOMER sees from what we BUY:
--
--   catalog_products   one customer-facing listing (Nigeria · 1GB · 7 days)
--   supplier_products  each supplier's SKU + cost for that listing (N per product)
--   marketplace_pricing_rules      tiered markup bands that derive display price from cost
--   import_runs        history of every CSV/API import
--   purchase_attempts  per-supplier attempt log powering failover + success rate
--
-- Suppliers are the EXISTING `vendors` table (it already drives routing, health,
-- circuit breaking and provider metrics) extended with marketplace fields —
-- rather than a second, competing identity for the same provider.
--
-- `catalog_items` is untouched: it stays the simple per-vendor catalogue for
-- pass-through VTU services. eSIM moves to the marketplace model.
--
-- Money is in minor units (cents) everywhere, per the ledger rules.
-- Additive only.
-- ============================================================

-- ---------- Suppliers (vendors, extended) ----------
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS name                        text,
  ADD COLUMN IF NOT EXISTS slug                        text,
  ADD COLUMN IF NOT EXISTS api_type                    text,             -- rest|graphql|csv_only
  ADD COLUMN IF NOT EXISTS api_endpoint                text,
  ADD COLUMN IF NOT EXISTS currency                    char(3) NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS success_rate                numeric(5,4),     -- 0..1, rolled up from purchase_attempts
  ADD COLUMN IF NOT EXISTS average_response_ms         integer,
  ADD COLUMN IF NOT EXISTS supports_realtime_inventory boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_slug ON vendors (slug) WHERE slug IS NOT NULL;

-- ---------- Catalog products (the ONE listing a customer sees) ----------
CREATE TABLE IF NOT EXISTS catalog_products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Matching identity. `fingerprint` is the normalised join key that makes
  -- "Nigeria MTN 1GB 7 days" from four suppliers collapse into one row.
  fingerprint    text NOT NULL UNIQUE,
  country        text,                                  -- Alpha-2, or NULL for region/global
  region         text,
  operator       text,
  data_amount    numeric(12,3) NOT NULL,
  data_unit      text NOT NULL DEFAULT 'GB',            -- GB|MB
  validity       integer NOT NULL,
  validity_unit  text NOT NULL DEFAULT 'DAY',
  network_type   text,                                  -- 4G|5G|3G/4G
  category       text NOT NULL DEFAULT 'esim',          -- service family: esim, data, ...

  -- Pricing (derived, then optionally overridden by an admin).
  currency                  char(3) NOT NULL DEFAULT 'USD',
  lowest_supplier_cost_minor bigint,                    -- refreshed on import/repricing
  display_price_minor        bigint,                    -- what the customer pays
  price_override_minor       bigint,                    -- admin fixed price (wins)
  markup_override_pct        numeric(6,2),              -- admin markup instead of the tier
  promo_price_minor          bigint,                    -- promotional price (wins over override)
  override_expires_at        timestamptz,               -- when overrides/promos lapse

  recommended_supplier_id text REFERENCES vendors(id),  -- manual supplier pin
  display_name text,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalog_products_browse
  ON catalog_products (category, country, active);
CREATE INDEX IF NOT EXISTS idx_catalog_products_region
  ON catalog_products (category, region, active);

-- ---------- Supplier products (each supplier's SKU for a listing) ----------
CREATE TABLE IF NOT EXISTS supplier_products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  catalog_product_id uuid NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
  supplier_id        text NOT NULL REFERENCES vendors(id),
  supplier_sku       text NOT NULL,                     -- their packageCode / slug
  supplier_cost_minor bigint NOT NULL,
  currency           char(3) NOT NULL DEFAULT 'USD',
  stock_status       text NOT NULL DEFAULT 'in_stock',  -- in_stock|out_of_stock|unknown
  api_status         text NOT NULL DEFAULT 'ok',        -- ok|degraded|down
  purchase_priority  integer NOT NULL DEFAULT 100,      -- lower wins, ties broken by cost
  raw                jsonb,                             -- original supplier payload
  active             boolean NOT NULL DEFAULT true,
  last_updated       timestamptz NOT NULL DEFAULT now(),

  -- One SKU per supplier; re-importing updates in place instead of duplicating.
  UNIQUE (supplier_id, supplier_sku)
);

CREATE INDEX IF NOT EXISTS idx_supplier_products_selection
  ON supplier_products (catalog_product_id, active, stock_status, supplier_cost_minor);

-- ---------- Pricing rules (tiered markup bands) ----------
CREATE TABLE IF NOT EXISTS marketplace_pricing_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           text NOT NULL,
  -- Band is on SUPPLIER COST, inclusive lower / exclusive upper. NULL max = ∞.
  min_cost_minor bigint NOT NULL DEFAULT 0,
  max_cost_minor bigint,
  markup_pct     numeric(6,2) NOT NULL,
  -- Optional scoping; the most specific active rule wins (see pricing.ts).
  category    text,
  country     text,
  supplier_id text REFERENCES vendors(id),
  priority    integer NOT NULL DEFAULT 100,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mkt_pricing_rules_lookup ON marketplace_pricing_rules (active, min_cost_minor);

-- Default global bands (USD cents), exactly as specified.
INSERT INTO marketplace_pricing_rules (name, min_cost_minor, max_cost_minor, markup_pct, priority)
VALUES
  ('Tier 1 · under $3',   0,    300,  145, 900),
  ('Tier 2 · $3–$5',      300,  500,  110, 900),
  ('Tier 3 · $5–$10',     500,  1000, 80,  900),
  ('Tier 4 · $10–$20',    1000, 2000, 60,  900),
  ('Tier 5 · over $20',   2000, NULL, 40,  900)
ON CONFLICT DO NOTHING;

-- ---------- Import history ----------
CREATE TABLE IF NOT EXISTS import_runs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id text NOT NULL REFERENCES vendors(id),
  source      text NOT NULL,                            -- csv|api
  status      text NOT NULL DEFAULT 'running',          -- running|completed|failed
  products_imported integer NOT NULL DEFAULT 0,
  products_updated  integer NOT NULL DEFAULT 0,
  products_failed   integer NOT NULL DEFAULT 0,
  duration_ms integer,
  error       text,
  actor       text,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_import_runs_recent ON import_runs (started_at DESC);

-- ---------- Purchase attempts (failover log + success-rate source) ----------
CREATE TABLE IF NOT EXISTS purchase_attempts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  txn_id             uuid REFERENCES transactions(id),
  catalog_product_id uuid REFERENCES catalog_products(id),
  supplier_id        text NOT NULL REFERENCES vendors(id),
  attempt_no  integer NOT NULL,
  status      text NOT NULL,                            -- success|failed|pending
  error_code  text,
  error_message text,
  latency_ms  integer,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_attempts_supplier
  ON purchase_attempts (supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_attempts_txn ON purchase_attempts (txn_id);

-- Name the suppliers we already know about so the admin UI reads nicely.
UPDATE vendors SET name = COALESCE(name, 'eSIM Access'), slug = COALESCE(slug, 'esim-access'),
       api_type = COALESCE(api_type, 'rest'), api_endpoint = COALESCE(api_endpoint, 'https://api.esimaccess.com'),
       supports_realtime_inventory = true
 WHERE id = 'esim_access';
UPDATE vendors SET name = COALESCE(name, 'Mock VTU'), slug = COALESCE(slug, id), api_type = COALESCE(api_type, 'rest')
 WHERE name IS NULL;
