-- ============================================================
-- KONEK — Migration 0020: onboarding tour
-- Admin-editable step content for the "Welcome to Konek" first-run tour,
-- same CMS pattern as in_app_messages (0017): draft/active/inactive
-- status, ordered by step_order. users.onboarding_completed_at tracks
-- whether a user has finished or skipped the tour so it only shows once.
-- ============================================================

CREATE TABLE onboarding_tour_steps (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  step_order int NOT NULL,
  icon text NOT NULL DEFAULT '✨',
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'active',              -- draft|active|inactive
  created_by uuid REFERENCES admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_onboarding_tour_steps_order ON onboarding_tour_steps (step_order);

ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

INSERT INTO onboarding_tour_steps (step_order, icon, title, body) VALUES
  (1, '📱', 'One platform, not six apps', 'Airtime, data, eSIM, bills and global payments live in one place, so you stop switching between apps to get through your day.'),
  (2, '🌍', 'Stay connected anywhere', 'Buy airtime and data at home, plus international top-ups and travel eSIMs, all from the same account.'),
  (3, '💵', 'Get paid globally', 'Open a USD account to receive international payments and hold a virtual card for spending online.'),
  (4, '⚡', 'Handle bills in seconds', 'Electricity, cable, exam pins and betting, paid instantly with real-time confirmation.'),
  (5, '🎁', 'Earn as you go', 'Collect coins every time you transact and build a streak for extra rewards.');
