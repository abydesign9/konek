-- ============================================================
-- KONEK — Migration 0002: phone+OTP auth
-- ============================================================

CREATE TABLE otp_codes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  purpose text NOT NULL DEFAULT 'login',   -- login|signup
  vendor_ref text,
  attempt_count smallint NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_phone_active ON otp_codes (phone) WHERE consumed_at IS NULL;

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_user ON sessions (user_id);
