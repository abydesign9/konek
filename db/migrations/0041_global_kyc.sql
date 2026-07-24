-- Global, configurable KYC.
--
-- Konek is a global app: BVN/NIN are Nigeria-only methods, every other country
-- has its own regulator-accepted IDs. This replaces the hardcoded BVN/NIN + tier
-- promotion with a data-driven model, mirroring how Wise/Revolut/Sumsub operate:
--   * verification_methods  — registry of every method we can ask for
--   * kyc_providers         — pluggable vendors, routed by (country, method)
--   * kyc_requirements      — the matrix: (country, tier) -> required method groups
--   * user_verifications    — per-user, per-method status (the source of truth)
-- Tier is COMPUTED from user_verifications against the requirements for the
-- user's country. Adding a country/provider is data, not code.
--
-- users.bvn_verified / nin_verified / liveness_verified are kept for back-compat
-- and continue to be maintained for NG users, but tier no longer depends on them.

-- ---------------------------------------------------------------------------
-- 1. Method registry -------------------------------------------------------
CREATE TABLE verification_methods (
  code            text PRIMARY KEY,                 -- bvn | nin | passport | national_id | drivers_licence | ssn_last4 | voters_card | aadhaar | selfie_liveness | proof_of_address
  label           text NOT NULL,
  kind            text NOT NULL,                    -- number_lookup | document | biometric | address
  validation_regex text,                            -- for number_lookup inputs (server re-validates)
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO verification_methods (code, label, kind, validation_regex) VALUES
  ('bvn',             'Bank Verification Number (BVN)', 'number_lookup', '^\d{11}$'),
  ('nin',             'National Identity Number (NIN)', 'number_lookup', '^\d{11}$'),
  ('ssn_last4',       'Social Security Number (last 4)','number_lookup', '^\d{4}$'),
  ('aadhaar',         'Aadhaar Number',                'number_lookup', '^\d{12}$'),
  ('passport',        'International Passport',         'document',      NULL),
  ('national_id',     'National ID Card',              'document',      NULL),
  ('drivers_licence', 'Driver''s Licence',              'document',      NULL),
  ('voters_card',     'Voter''s Card',                  'document',      NULL),
  ('selfie_liveness', 'Selfie / liveness check',       'biometric',     NULL),
  ('proof_of_address','Proof of address',              'address',       NULL);

-- ---------------------------------------------------------------------------
-- 2. Provider registry (pluggable, routed by country + method) --------------
CREATE TABLE kyc_providers (
  id          text PRIMARY KEY,                     -- mock_dojah | mock_global | smile_id | sumsub | onfido ...
  name        text NOT NULL,
  adapter_key text NOT NULL,                        -- which code adapter fulfils this (see src/vendors/kyc)
  countries   text[] NOT NULL DEFAULT '{*}',        -- ISO2 list, or {*} for global
  methods     text[] NOT NULL DEFAULT '{}',         -- method codes this provider can verify
  priority    int NOT NULL DEFAULT 100,             -- lower wins when several match
  enabled     boolean NOT NULL DEFAULT true,
  config      jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Ships with mock adapters so the whole flow works before real vendor keys are
-- added. Real providers (Smile ID, Sumsub, Onfido...) are inserted as rows and
-- pick up traffic by (country, method) with no code change.
INSERT INTO kyc_providers (id, name, adapter_key, countries, methods, priority) VALUES
  ('mock_dojah',  'Dojah (mock)',        'mock_dojah',  '{NG}', '{bvn,nin,selfie_liveness}', 10),
  ('mock_global', 'Global KYC (mock)',   'mock_global', '{*}',
     '{passport,national_id,drivers_licence,ssn_last4,aadhaar,voters_card,selfie_liveness,proof_of_address}', 50);

-- ---------------------------------------------------------------------------
-- 3. Requirements matrix ----------------------------------------------------
-- method_groups is an array of groups; a tier is satisfied when EACH group has
-- at least one verified method (AND of ORs). country_code NULL = global default
-- used when a country has no specific row for that tier.
CREATE TABLE kyc_requirements (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code  text,                               -- NULL = global fallback
  tier          smallint NOT NULL,                  -- tier granted when satisfied (1 transact | 2 finance)
  method_groups jsonb NOT NULL,                     -- e.g. [["bvn","nin"]]
  label         text,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX kyc_requirements_scope ON kyc_requirements (COALESCE(country_code, '*'), tier);

-- Global fallback: any country without a specific rule.
INSERT INTO kyc_requirements (country_code, tier, method_groups, label) VALUES
  (NULL, 1, '[["passport","national_id","drivers_licence"]]',         'Transact — any government ID'),
  (NULL, 2, '[["passport","national_id","drivers_licence"],["selfie_liveness"]]', 'Finance — ID + selfie');

-- Nigeria: BVN or NIN to transact; + selfie for finance.
INSERT INTO kyc_requirements (country_code, tier, method_groups, label) VALUES
  ('NG', 1, '[["bvn","nin"]]',                    'Transact — BVN or NIN'),
  ('NG', 2, '[["bvn","nin"],["selfie_liveness"]]','Finance — BVN/NIN + selfie');

-- United States: government ID (+ SSN last 4) to transact; + selfie for finance.
INSERT INTO kyc_requirements (country_code, tier, method_groups, label) VALUES
  ('US', 1, '[["ssn_last4"],["passport","drivers_licence","national_id"]]', 'Transact — SSN + ID'),
  ('US', 2, '[["ssn_last4"],["passport","drivers_licence","national_id"],["selfie_liveness"]]', 'Finance — SSN + ID + selfie');

-- Ghana / Kenya / South Africa: national ID (or passport) to transact; + selfie for finance.
INSERT INTO kyc_requirements (country_code, tier, method_groups, label) VALUES
  ('GH', 1, '[["national_id","passport"]]',                    'Transact — Ghana Card or passport'),
  ('GH', 2, '[["national_id","passport"],["selfie_liveness"]]','Finance — ID + selfie'),
  ('KE', 1, '[["national_id","passport"]]',                    'Transact — Huduma / national ID or passport'),
  ('KE', 2, '[["national_id","passport"],["selfie_liveness"]]','Finance — ID + selfie'),
  ('ZA', 1, '[["national_id","passport"]]',                    'Transact — SA ID or passport'),
  ('ZA', 2, '[["national_id","passport"],["selfie_liveness"]]','Finance — ID + selfie'),
  ('GB', 1, '[["passport","drivers_licence"]]',                'Transact — passport or driving licence'),
  ('GB', 2, '[["passport","drivers_licence"],["selfie_liveness"]]','Finance — ID + selfie');

-- ---------------------------------------------------------------------------
-- 4. Per-user, per-method verification records (source of truth for tier) ---
CREATE TABLE user_verifications (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           uuid NOT NULL REFERENCES users(id),
  method            text NOT NULL REFERENCES verification_methods(code),
  status            text NOT NULL DEFAULT 'pending',  -- pending | verified | rejected | expired
  provider          text,                             -- kyc_providers.id used
  vendor_ref        text,
  detail_encrypted  text,                             -- AES-GCM envelope, aad = user_verifications:<user_id>
  verified_at       timestamptz,
  expires_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, method)
);
CREATE INDEX user_verifications_user ON user_verifications (user_id);

-- Backfill existing NG verifications into the new model so nobody loses their tier.
INSERT INTO user_verifications (user_id, method, status, provider, verified_at)
SELECT id, 'bvn', 'verified', 'mock_dojah', updated_at FROM users WHERE bvn_verified = true
ON CONFLICT (user_id, method) DO NOTHING;
INSERT INTO user_verifications (user_id, method, status, provider, verified_at)
SELECT id, 'nin', 'verified', 'mock_dojah', updated_at FROM users WHERE nin_verified = true
ON CONFLICT (user_id, method) DO NOTHING;
INSERT INTO user_verifications (user_id, method, status, provider, verified_at)
SELECT id, 'selfie_liveness', 'verified', 'mock_dojah', updated_at FROM users WHERE liveness_verified = true
ON CONFLICT (user_id, method) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Admin permission for editing the KYC config (matrix/providers/methods) --
INSERT INTO admin_permissions (key, type_key, label)
  VALUES ('kyc.config', 'kyc', 'Configure KYC requirements & providers')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO admin_role_permissions (role_name, permission_key)
  VALUES ('super_admin', 'kyc.config')
  ON CONFLICT DO NOTHING;
