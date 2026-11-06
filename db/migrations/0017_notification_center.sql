-- ============================================================
-- Raviion — Migration 0017: Notification Center (M12 slice 5)
-- Templates, campaigns (with audience/scheduling/analytics), and an
-- in-app-message CMS. Actual timed dispatch of scheduled/recurring
-- campaigns needs a background worker that doesn't exist yet — this is
-- the config layer (create/edit/enable/disable/view), same honest
-- deferral as recurring top-up and scheduled bulk distributions.
-- ============================================================

CREATE TABLE notification_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  created_by uuid REFERENCES admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notification_campaigns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  template_id uuid REFERENCES notification_templates(id),
  subject text NOT NULL,
  body text NOT NULL,
  category text,
  channels text[] NOT NULL DEFAULT '{push}',          -- push|in_app|email (sms/whatsapp: future)
  audience text NOT NULL DEFAULT 'all',                -- all|tier1|tier2|business|agent|diaspora|new_users|custom
  audience_meta jsonb,                                 -- e.g. {"phones": [...]} for a custom segment
  schedule_type text NOT NULL DEFAULT 'immediate',     -- immediate|scheduled|recurring
  scheduled_at timestamptz,
  recurring_interval_hours int,
  timezone text NOT NULL DEFAULT 'Africa/Lagos',
  expiry_at timestamptz,
  status text NOT NULL DEFAULT 'draft',                -- draft|scheduled|active|sent|inactive
  created_by uuid REFERENCES admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_sent_at timestamptz
);

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES notification_campaigns(id),
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz;
CREATE INDEX idx_notifications_campaign ON notifications (campaign_id) WHERE campaign_id IS NOT NULL;

CREATE TABLE in_app_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  type text NOT NULL DEFAULT 'image',                  -- image|video|survey
  message text NOT NULL,
  url text,
  dimension text NOT NULL DEFAULT 'medium',            -- small|medium|large
  display_duration_seconds int NOT NULL DEFAULT 5,
  active boolean NOT NULL DEFAULT true,
  closable boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft',                -- draft|active|inactive
  created_by uuid REFERENCES admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_in_app_active ON in_app_messages (status) WHERE status = 'active' AND active = true;

-- New permission for this module — the migration-0015 super_admin wildcard
-- grant only captured permissions that existed at that time.
INSERT INTO admin_permission_types (key, label) VALUES ('marketing', 'Marketing')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO admin_permissions (key, type_key, label) VALUES
  ('marketing.manage', 'marketing', 'Create and send notification campaigns, templates and in-app messages')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO admin_role_permissions (role_name, permission_key) VALUES
  ('super_admin', 'marketing.manage')
  ON CONFLICT DO NOTHING;
