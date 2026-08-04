-- ============================================================
-- KONEK — Migration 0009: squad_goals needs a unique constraint
-- on (squad_id, period_start) so "one goal per squad per week"
-- can actually be enforced with ON CONFLICT DO NOTHING — without
-- it, every qualifying purchase would insert a duplicate goal row.
-- ============================================================

ALTER TABLE squad_goals ADD CONSTRAINT squad_goals_squad_period_unique UNIQUE (squad_id, period_start);
