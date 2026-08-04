-- ============================================================
-- KONEK — Migration 0012: business team members (M9 Team Management)
-- A business account can grant existing Konek users a role on the business.
-- The owner (business_accounts.owner_user_id) is implicit and not stored here.
-- Roles per the PRD: admin | finance | hr | marketing | viewer.
-- Money still moves only from the owner's prepaid balance; membership only
-- grants visibility/actions, every action audited under the member's user id.
-- ============================================================

CREATE TABLE business_team_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_account_id uuid NOT NULL REFERENCES business_accounts(id),
  user_id uuid NOT NULL REFERENCES users(id),
  role text NOT NULL DEFAULT 'viewer',              -- admin|finance|hr|marketing|viewer
  status text NOT NULL DEFAULT 'active',            -- active|removed (no deletes)
  invited_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  UNIQUE (business_account_id, user_id)
);

CREATE INDEX idx_team_user ON business_team_members (user_id) WHERE status = 'active';
