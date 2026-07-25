-- Register SmileID as a KYC provider. Disabled by default; enable it from
-- Admin > KYC config once the SmileID env keys are set. When enabled and its
-- priority beats the mock for a country/method, it takes over verification.
INSERT INTO kyc_providers (id, name, adapter_key, countries, methods, priority, enabled)
VALUES (
  'smile_id',
  'SmileID',
  'smile_id',
  '{NG,GH,KE,ZA,UG,CI,SN}',
  '{bvn,nin,national_id,passport,drivers_licence,selfie_liveness}',
  5,
  false
)
ON CONFLICT (id) DO NOTHING;
