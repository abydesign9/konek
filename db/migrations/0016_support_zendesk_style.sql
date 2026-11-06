-- ============================================================
-- Raviion — Migration 0016: Customer Support upgrade (M12 slice 4)
-- Upgrades the M11 support ticket/reply model toward the requested
-- Zendesk-style shape: category, priority, explicit assignment, internal
-- (admin-only) notes, a real status pipeline, an SLA timer, and a status
-- timeline. Attachments and Discord alerts are explicitly deferred (no file
-- upload infra / no real webhook credentials yet).
-- ============================================================

ALTER TABLE support_messages
  ADD COLUMN IF NOT EXISTS category text,                      -- kyc|payments|vtu|esim|card|dollar_account|other
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium', -- low|medium|high|urgent
  ADD COLUMN IF NOT EXISTS sla_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- status is now one of: open|assigned|waiting_on_customer|resolved|closed
-- (still free text — no rewrite of existing 'open'/'in_progress'/'resolved'
-- rows needed; 'in_progress' rows just read as a legacy status label).

CREATE TABLE support_notes (                          -- internal, never shown to the customer
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid NOT NULL REFERENCES support_messages(id),
  admin_id uuid NOT NULL REFERENCES admin_users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_support_notes_msg ON support_notes (message_id, created_at ASC);

CREATE TABLE support_status_events (                  -- the "Status Timeline"
  id bigserial PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES support_messages(id),
  from_status text,
  to_status text NOT NULL,
  actor_type text NOT NULL,                           -- user|admin|system
  actor_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_support_status_events_msg ON support_status_events (message_id, created_at ASC);

-- Knowledge Base / FAQs
CREATE TABLE faq_articles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category text NOT NULL DEFAULT 'general',
  question text NOT NULL,
  answer text NOT NULL,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_faq_published ON faq_articles (category) WHERE published = true;
