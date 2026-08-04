-- ============================================================
-- KONEK — Migration 0031: agent commission dedup (M9)
--
-- Backs the ON CONFLICT in recordCommissionIfAgent: a source transaction earns
-- an agent commission at most once, even if the post-delivery hook is retried.
--
-- Additive only.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_commissions_source_txn
  ON agent_commissions (source_txn_id);
