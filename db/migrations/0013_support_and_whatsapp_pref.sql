-- ============================================================
-- KONEK — Migration 0013: support messages + WhatsApp preference
-- ============================================================

-- WhatsApp was a notification channel with no dedicated opt-out — every
-- other channel (push/sms/email) already had one.
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT true;

-- Lightweight support ticket + threaded replies (M11 "Support Chat" —
-- request/response threading, not real-time websocket chat).
CREATE TABLE support_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id),
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open',              -- open|in_progress|resolved
  assigned_admin_id uuid REFERENCES admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX idx_support_open ON support_messages (status) WHERE status != 'resolved';
CREATE INDEX idx_support_user ON support_messages (user_id, created_at DESC);

CREATE TABLE support_replies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid NOT NULL REFERENCES support_messages(id),
  author_type text NOT NULL,                        -- user|admin
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_support_replies_msg ON support_replies (message_id, created_at ASC);
