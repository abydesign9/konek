-- ============================================================
-- KONEK — Migration 0033: extended profile fields
--
-- Adds self-service profile fields. username + avatar_url are low-sensitivity
-- (display). date_of_birth and address are sensitive PII, so they are stored as
-- AES-256-GCM envelopes (jsonb) via src/lib/crypto/pii.ts, bound to the owner —
-- never as plaintext columns. See [[pii-encryption-standard]].
--
-- Additive only.
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS date_of_birth_encrypted jsonb,
  ADD COLUMN IF NOT EXISTS address_encrypted jsonb;

-- Case-insensitive uniqueness for usernames (the column UNIQUE above is
-- case-sensitive; this index is the real guard).
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (lower(username));
