-- ============================================================
-- KONEK — Migration 0021: recurring schema (M4/M9) + Settings expansion
-- Two long-flagged "config layer, nothing fires yet" deferrals (see
-- 0017's comment and api/cron/tick's own comment) get their tables and a
-- real dispatcher wired into the existing cron tick:
--   - recurring_topups: M4's "scheduled/recurring top-ups (weekly/monthly
--     to Mum)" retention anchor.
--   - recurring_distributions: M9's scheduled bulk VTU distribution for
--     business accounts, same purchase path as an on-demand bulk_batch.
-- Plus the rest of the Settings expansion: theme/language preference,
-- device/session metadata + revoke, and a biometric app-lock flag.
-- ============================================================

CREATE TABLE recurring_topups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id),
  phone text NOT NULL,
  network text NOT NULL,                              -- "<countryCode>:<carrierId>", same encoding as beneficiaries
  amount_minor bigint NOT NULL,                        -- USD cents, same presets as /api/purchases intl_topup
  interval_days int NOT NULL DEFAULT 30,               -- 7 weekly | 30 monthly
  next_run_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_status text,                                    -- delivered|failed|skipped_kyc|skipped_balance
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_recurring_topups_due ON recurring_topups (next_run_at) WHERE active = true;
CREATE INDEX idx_recurring_topups_user ON recurring_topups (user_id);

CREATE TABLE recurring_distributions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_account_id uuid NOT NULL REFERENCES business_accounts(id),
  created_by uuid NOT NULL REFERENCES users(id),
  purpose text NOT NULL,
  service_type text NOT NULL DEFAULT 'airtime',
  amount_minor_per_recipient bigint NOT NULL,          -- NGN
  recipients jsonb NOT NULL,                           -- [{phone, network}, ...] — same shape as bulk_batch_items.recipient
  interval_days int NOT NULL DEFAULT 30,
  next_run_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_status text,                                    -- delivered|partial|failed
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_recurring_distributions_due ON recurring_distributions (next_run_at) WHERE active = true;
CREATE INDEX idx_recurring_distributions_business ON recurring_distributions (business_account_id);

-- Settings expansion: appearance + language preference (real persistence;
-- language selection does not yet translate app copy — same "config layer
-- ahead of the full feature" honesty as everything else deferred here).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'system',      -- light|dark|system
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en',       -- en|fr|pcm
  ADD COLUMN IF NOT EXISTS biometric_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS biometric_credential_id text;

-- Device/session management: sessions existed since 0002 but carried no
-- device info, so there was nothing to show a user beyond "you're logged
-- in." Adds what's captured at login/signup; last_seen_at updates on use
-- so a stale session is visibly stale before it's revoked.
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS ip text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();
