-- ============================================================
-- KONEK — Migration 0005: seed the second sandbox VTU vendor
-- (enables health-check failover routing)
-- ============================================================

INSERT INTO vendors (id, kind, priority, healthy, config)
VALUES ('mock_vtu_2', 'vtu', 2, true, '{}')
ON CONFLICT (id) DO NOTHING;
