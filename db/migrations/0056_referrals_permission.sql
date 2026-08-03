-- Referral conversion moderation (PATCH /api/admin/referrals/[id]) was
-- gated only by admin-session presence, not a role permission -- any admin
-- account could reject/reinstate a referral payout regardless of role.

INSERT INTO admin_permissions (key, type_key, label) VALUES
  ('referrals.manage', 'risk', 'Moderate referral conversions (reject/reinstate before payout)')
ON CONFLICT (key) DO NOTHING;

INSERT INTO admin_role_permissions (role_name, permission_key) VALUES
  ('super_admin', 'referrals.manage'),
  ('risk', 'referrals.manage')
ON CONFLICT DO NOTHING;
