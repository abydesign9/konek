-- ============================================================
-- Raviion — Migration 0030: card dispute dedup guard (M7)
--
-- Backstops the application check in fileDispute: at most one OPEN dispute per
-- card transaction, so the ~20% deterrent fee can't be charged repeatedly.
-- Partial unique index leaves room to re-file after a prior dispute is resolved
-- (won/lost).
--
-- Additive only.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_card_disputes_open
  ON card_disputes (card_transaction_id)
  WHERE status IN ('filed', 'under_review');
