-- ============================================================
-- KONEK — Migration 0032: email OTP support
--
-- Email is the primary identity, and new users must verify their email with a
-- one-time code before an account is created. otp_codes already stores phone
-- OTPs; this lets it also store email OTPs (phone becomes nullable, email added).
--
-- Additive only.
-- ============================================================

ALTER TABLE otp_codes
  ALTER COLUMN phone DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS email text;

CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes (email, created_at DESC);
