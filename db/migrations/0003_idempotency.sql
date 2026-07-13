-- ============================================================
-- KONEK — Migration 0003: idempotency store
-- ============================================================

CREATE TABLE idempotency_keys (
  key text PRIMARY KEY,
  request_hash text NOT NULL,
  response jsonb,
  status smallint NOT NULL DEFAULT 0,      -- 0 in_progress | 1 completed
  created_at timestamptz NOT NULL DEFAULT now()
);
