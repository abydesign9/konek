-- ============================================================
-- KONEK — Migration 0004: seed the sandbox VTU vendor
-- ============================================================

INSERT INTO vendors (id, kind, priority, healthy, config)
VALUES ('mock_vtu', 'vtu', 1, true, '{}')
ON CONFLICT (id) DO NOTHING;
