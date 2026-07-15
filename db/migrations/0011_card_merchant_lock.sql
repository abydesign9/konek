-- ============================================================
-- KONEK — Migration 0011: card merchant lock
-- Locks a virtual card to a single merchant name; only that merchant may
-- authorize. Spend limits already exist on the cards table
-- (single_txn_limit_minor, monthly_limit_minor) — this adds the lock.
-- ============================================================

ALTER TABLE cards ADD COLUMN IF NOT EXISTS merchant_lock text;
