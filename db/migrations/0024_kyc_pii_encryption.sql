-- ============================================================
-- KONEK — Migration 0024: encrypt KYC provider payloads at rest
--
-- M1 review finding: kyc_checks.raw_response stored full vendor payloads
-- (BVN/NIN identity data) as plaintext JSON — an NDPR exposure. Going forward
-- the payload is stored envelope-encrypted (AES-256-GCM, see src/lib/crypto/pii.ts)
-- in raw_response_encrypted, and only minimal operational fields stay in
-- plaintext (provider = vendor, reference = vendor_ref, status = result, plus the
-- new confidence / verified_name below, and created_at).
--
-- Additive only. raw_response is retained (not dropped) for backwards
-- compatibility and any historical-row backfill; new writes set it NULL.
-- ============================================================

ALTER TABLE kyc_checks
  ADD COLUMN IF NOT EXISTS raw_response_encrypted jsonb,   -- AES-256-GCM envelope
  ADD COLUMN IF NOT EXISTS confidence             numeric, -- provider match score, when supplied
  ADD COLUMN IF NOT EXISTS verified_name          text;    -- minimal operational field, when required

COMMENT ON COLUMN kyc_checks.raw_response IS
  'DEPRECATED for new writes — kept for historical rows only. Sensitive payloads now live encrypted in raw_response_encrypted.';
COMMENT ON COLUMN kyc_checks.raw_response_encrypted IS
  'Envelope-encrypted (AES-256-GCM) provider payload. Decrypt via src/lib/crypto/pii.ts with aad = ''kyc_checks:<user_id>''.';
