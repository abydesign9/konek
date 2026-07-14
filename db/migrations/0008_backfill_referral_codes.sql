-- ============================================================
-- KONEK — Migration 0008: backfill referral_codes for users
-- created before the Phase 2 referral_codes/referral_conversions
-- tables existed, so referral_conversions FK inserts don't fail
-- when an existing user is used as a referrer.
-- ============================================================

INSERT INTO referral_codes (code, user_id)
SELECT referral_code, id FROM users
WHERE referral_code IS NOT NULL
ON CONFLICT (code) DO NOTHING;
