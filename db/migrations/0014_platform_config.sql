-- ============================================================
-- KONEK — Migration 0014: platform config (M12 Rates Configuration)
-- Generic admin-editable key/value config store. First use: the FX rate
-- and spread that govern every USD-priced product (intl top-up, eSIM,
-- gift cards, dollar-account conversion) — previously hardcoded constants.
-- ============================================================

CREATE TABLE platform_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES admin_users(id)
);

INSERT INTO platform_config (key, value) VALUES
  ('fx_rate', '{"ngnPerUsd": 1600, "usdNgnSpreadPct": 0.015}');
