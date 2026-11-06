-- ============================================================
-- Raviion — Migration 0019: email + password auth
-- Replaces phone+OTP as the primary signup/login path. phone was
-- NOT NULL UNIQUE since 0001; it drops to nullable here because a new
-- account no longer collects one at signup (it's needed later, for VTU
-- recipient defaults and eventual SMS notifications, but that's a
-- separate onboarding step not built in this migration). password_hash
-- follows the same bcrypt convention as users.pin_hash — hashed at the
-- app layer, never stored or logged in plaintext.
-- ============================================================

ALTER TABLE users
  ALTER COLUMN phone DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS password_hash text;
