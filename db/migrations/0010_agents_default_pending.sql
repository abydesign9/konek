-- ============================================================
-- KONEK — Migration 0010: agents should start pending, not active
--
-- schema_phase2.sql's agents.status column comment documents
-- pending|active|suspended (implying admin approval gates
-- activation), but the column DEFAULT was 'active' — meaning any
-- self-service application auto-activated and could immediately
-- start earning commissions with zero review. Fixes the default
-- and corrects any agent rows that were auto-activated under the
-- old default without ever being explicitly approved.
-- ============================================================

ALTER TABLE agents ALTER COLUMN status SET DEFAULT 'pending';

UPDATE agents SET status = 'pending' WHERE status = 'active' AND approved_at IS NULL;
