-- ============================================================
-- Raviion — Migration 0006: referral codes
-- ============================================================

ALTER TABLE users ADD COLUMN referral_code text UNIQUE;

-- Backfill existing users with a short deterministic code.
UPDATE users SET referral_code = upper(substr(id::text, 1, 8)) WHERE referral_code IS NULL;

ALTER TABLE users ALTER COLUMN referral_code SET NOT NULL;
