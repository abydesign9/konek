-- ============================================================
-- KONEK — Migration 0022: business employee directory
-- Business Dashboard rework, foundation phase. business_team_members
-- (0012) is who can log into the business console — a separate concept
-- from the people a business distributes benefits to, which never had a
-- directory of their own (bulk_batch_items just carried raw
-- {phone, network} per batch, no name/department, nothing durable).
-- This gives the "employees" a business actually manages their own
-- table, independent of whether they have a Konek account.
-- ============================================================

CREATE TABLE business_employees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_account_id uuid NOT NULL REFERENCES business_accounts(id),
  full_name text NOT NULL,
  department text,
  phone text NOT NULL,
  network text NOT NULL,                              -- mtn|glo|airtel|9mobile
  status text NOT NULL DEFAULT 'active',               -- active|inactive
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_account_id, phone)
);
CREATE INDEX idx_business_employees_account ON business_employees (business_account_id) WHERE status = 'active';
