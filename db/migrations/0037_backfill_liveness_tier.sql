-- ============================================================
-- KONEK — Migration 0037: backfill finance tier for liveness-verified users
--
-- An earlier bug: submitLiveness set liveness_verified=true but never bumped
-- kyc_tier (fixed in code). Users who passed liveness BEFORE that fix are stuck
-- at tier 1, so the finance gate (USD/global accounts, cards, withdrawals) locks
-- them out even though they completed KYC and may already have an account.
--
-- This promotes those users to FINANCE (tier 2). Idempotent (WHERE kyc_tier < 2).
-- ============================================================

UPDATE users
   SET kyc_tier = 2,
       kyc_status = 'verified',
       updated_at = now()
 WHERE liveness_verified = true
   AND kyc_tier < 2;
