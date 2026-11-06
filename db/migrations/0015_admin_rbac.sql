-- ============================================================
-- Raviion — Migration 0015: admin RBAC (M12 slice 2)
-- admin_users.role was a free-text label with nothing checking it — every
-- admin API route only asked "is this a logged-in admin?" This gives roles
-- real structure: permission types (categories), individual permissions,
-- and a role->permission grant table, with admin_users.role now a real FK.
-- ============================================================

CREATE TABLE admin_roles (
  name text PRIMARY KEY,                              -- support|kyc_reviewer|risk|finance|super_admin|...
  description text
);

CREATE TABLE admin_permission_types (                 -- categories, e.g. "Rates", "Support"
  key text PRIMARY KEY,
  label text NOT NULL
);

CREATE TABLE admin_permissions (
  key text PRIMARY KEY,                               -- e.g. 'rates.edit'
  type_key text NOT NULL REFERENCES admin_permission_types(key),
  label text NOT NULL
);

CREATE TABLE admin_role_permissions (
  role_name text NOT NULL REFERENCES admin_roles(name),
  permission_key text NOT NULL REFERENCES admin_permissions(key),
  PRIMARY KEY (role_name, permission_key)
);

INSERT INTO admin_roles (name, description) VALUES
  ('super_admin', 'Full access to every admin capability'),
  ('finance', 'Rates, reconciliation, refunds, agent/business payouts'),
  ('risk', 'Fraud queue and velocity-limit review'),
  ('kyc_reviewer', 'KYC and business verification'),
  ('support', 'Customer support tickets and notifications');

INSERT INTO admin_permission_types (key, label) VALUES
  ('system', 'System'),
  ('rates', 'Rates'),
  ('finance', 'Finance'),
  ('risk', 'Risk & Fraud'),
  ('kyc', 'KYC & Verification'),
  ('support', 'Support');

INSERT INTO admin_permissions (key, type_key, label) VALUES
  ('admin_users.manage', 'system', 'Invite, deactivate and change admin roles'),
  ('roles.manage', 'system', 'Edit role permission grants'),
  ('rates.edit', 'rates', 'Edit FX rate and catalog pricing'),
  ('refunds.issue', 'finance', 'Issue transaction refunds'),
  ('reconciliation.view', 'finance', 'View reconciliation runs'),
  ('agents.manage', 'finance', 'Approve agents and pay commissions'),
  ('business.approve', 'finance', 'Approve business (KYB) accounts'),
  ('fraud.review', 'risk', 'Assign and resolve fraud queue items'),
  ('vendors.manage', 'risk', 'Toggle vendor health/routing'),
  ('kyc.review', 'kyc', 'Review KYC submissions'),
  ('support.reply', 'support', 'Reply to and resolve support tickets');

-- super_admin: everything
INSERT INTO admin_role_permissions (role_name, permission_key)
  SELECT 'super_admin', key FROM admin_permissions;

INSERT INTO admin_role_permissions (role_name, permission_key) VALUES
  ('finance', 'rates.edit'),
  ('finance', 'refunds.issue'),
  ('finance', 'reconciliation.view'),
  ('finance', 'agents.manage'),
  ('finance', 'business.approve'),
  ('risk', 'fraud.review'),
  ('risk', 'vendors.manage'),
  ('kyc_reviewer', 'kyc.review'),
  ('kyc_reviewer', 'business.approve'),
  ('support', 'support.reply');

-- admin_users.role now references admin_roles(name) — existing values
-- (support|kyc_reviewer|risk|finance|super_admin) already match, so this
-- FK add is a no-op constraint-wise on current data.
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_fkey FOREIGN KEY (role) REFERENCES admin_roles(name);
