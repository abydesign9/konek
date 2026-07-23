-- ============================================================
-- KONEK — Migration 0039: register the live eSIM provider (eSIM Access)
--
-- Routing (src/vendors/registry.ts selectVendor) only considers vendors that
-- have a row here AND a registered adapter. The adapter registers itself only
-- when ESIM_ACCESS_ACCESS_CODE is set, so this row is safe to add ahead of the
-- credentials: without them the adapter isn't registered and routing skips it,
-- falling back to the mock.
--
-- priority 1 (ahead of the mocks, which sit at 1 for 'vtu' too) with a lower
-- cost_weight so it wins once it's healthy and registered.
--
-- Idempotent.
-- ============================================================

INSERT INTO vendors (id, kind, priority, healthy, enabled, cost_weight, config)
VALUES (
  'esim_access',
  'vtu',                       -- eSIM routes through the 'vtu' kind (see SERVICE_TYPE_TO_VENDOR_KIND)
  1,
  true,
  true,
  0.9,
  '{"provider":"esimaccess","baseUrl":"https://api.esimaccess.com","services":["esim"]}'
)
ON CONFLICT (id) DO NOTHING;
