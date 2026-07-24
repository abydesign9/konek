-- Admin capabilities for customer management and manual funding reconciliation.
-- Transaction blocking reuses the existing 'fraud.review' permission.

INSERT INTO admin_permissions (key, type_key, label) VALUES
  ('customers.manage', 'risk', 'View, suspend, block and close customer accounts'),
  ('funding.approve',  'finance', 'Manually verify and credit timed-out wallet funding')
ON CONFLICT (key) DO NOTHING;

-- Grant to super_admin (which otherwise only had permissions that existed at seed time).
INSERT INTO admin_role_permissions (role_name, permission_key) VALUES
  ('super_admin', 'customers.manage'),
  ('super_admin', 'funding.approve')
ON CONFLICT DO NOTHING;

-- Sensible defaults for the specialist roles that already exist.
INSERT INTO admin_role_permissions (role_name, permission_key) VALUES
  ('risk', 'customers.manage'),
  ('finance', 'funding.approve')
ON CONFLICT DO NOTHING;
