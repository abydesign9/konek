-- ============================================================
-- Raviion — Core Schema v1  (Postgres)
-- Money rules: integers in minor units; double-entry ledger;
-- no deletes on financial tables; reversals only.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------- USERS & KYC ----------
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone         text UNIQUE NOT NULL,
  email         text UNIQUE,
  full_name     text,
  country_code  text NOT NULL DEFAULT 'NG',
  kyc_tier      smallint NOT NULL DEFAULT 0,        -- 0 browse | 1 transact | 2 finance | 9 business
  kyc_status    text NOT NULL DEFAULT 'none',        -- none|pending|verified|rejected
  bvn_verified  boolean NOT NULL DEFAULT false,
  nin_verified  boolean NOT NULL DEFAULT false,
  liveness_verified boolean NOT NULL DEFAULT false,
  pin_hash      text,
  status        text NOT NULL DEFAULT 'active',      -- active|suspended|closed
  referred_by   uuid REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE kyc_checks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id),
  check_type text NOT NULL,                          -- bvn|nin|liveness|doc|kyb
  vendor text NOT NULL,                              -- dojah|smileid|youverify
  vendor_ref text,
  result text NOT NULL DEFAULT 'pending',            -- pending|pass|fail
  raw_response jsonb,
  cost_minor bigint,                                 -- what the check cost us (kobo)
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- LEDGER (the heart — do not touch casually) ----------
CREATE TABLE ledger_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_type text NOT NULL,                          -- user|platform|vendor
  owner_id   uuid,                                   -- users.id when owner_type='user'
  currency   char(3) NOT NULL,                       -- NGN|USD
  kind       text NOT NULL,                          -- wallet|float|revenue|expense|liability|reserve|gateway
  UNIQUE (owner_type, owner_id, currency, kind)
);

CREATE TABLE journals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  txn_id uuid,                                       -- links to transactions.id
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ledger_entries (
  id bigserial PRIMARY KEY,
  journal_id uuid NOT NULL REFERENCES journals(id),
  account_id uuid NOT NULL REFERENCES ledger_accounts(id),
  amount_minor bigint NOT NULL,                      -- signed; SUM per journal must = 0 per currency
  currency char(3) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_entries_account ON ledger_entries (account_id, id);

-- Balanced-journal enforcement (deferred: checks at COMMIT)
CREATE OR REPLACE FUNCTION assert_journal_balanced() RETURNS trigger AS $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM (
    SELECT currency, SUM(amount_minor) s FROM ledger_entries
    WHERE journal_id = NEW.journal_id GROUP BY currency HAVING SUM(amount_minor) <> 0
  ) x;
  IF bad > 0 THEN RAISE EXCEPTION 'Unbalanced journal %', NEW.journal_id; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER journal_balanced AFTER INSERT ON ledger_entries
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assert_journal_balanced();

-- Cached balances (updated in same txn as entries; source of truth = SUM(entries))
CREATE TABLE account_balances (
  account_id uuid PRIMARY KEY REFERENCES ledger_accounts(id),
  balance_minor bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- TRANSACTIONS (product layer) ----------
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id),
  idempotency_key text NOT NULL,
  type text NOT NULL,       -- fund_wallet|airtime|data|cable|electricity|exam_pin|betting|intl_topup|esim|fx_convert|reward_credit|refund
  status text NOT NULL DEFAULT 'initiated',          -- initiated|pending_vendor|delivered|failed|refunded
  currency char(3) NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  fee_minor bigint NOT NULL DEFAULT 0,
  recipient jsonb,                                   -- {phone, network, meter_no, iuc, country, carrier...}
  vendor text,                                       -- which aggregator fulfilled
  vendor_ref text,
  vendor_response jsonb,
  token text,                                        -- electricity token / epin
  journal_id uuid REFERENCES journals(id),
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX idx_txn_user ON transactions (user_id, created_at DESC);
CREATE INDEX idx_txn_open ON transactions (status) WHERE status IN ('initiated','pending_vendor');

CREATE TABLE transaction_events (                    -- audit trail of state changes
  id bigserial PRIMARY KEY,
  txn_id uuid NOT NULL REFERENCES transactions(id),
  from_status text, to_status text NOT NULL,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- BENEFICIARIES / CATALOG ----------
CREATE TABLE beneficiaries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id),
  label text NOT NULL,                               -- "Mum"
  service_type text NOT NULL,                        -- airtime|data|cable|electricity|intl_topup
  details jsonb NOT NULL,                            -- {phone, network} etc
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE catalog_items (                         -- cached vendor plans (data bundles, eSIM plans...)
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor text NOT NULL, service_type text NOT NULL,
  external_id text NOT NULL,
  name text NOT NULL, country text, network text,
  cost_minor bigint NOT NULL, price_minor bigint NOT NULL, currency char(3) NOT NULL,
  meta jsonb, active boolean NOT NULL DEFAULT true,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor, service_type, external_id)
);

-- ---------- VENDORS & WEBHOOKS ----------
CREATE TABLE vendors (
  id text PRIMARY KEY,                               -- 'reloadly','vtu_ng','esimaccess','paystack'
  kind text NOT NULL,                                -- vtu|intl|esim|psp|kyc
  priority int NOT NULL DEFAULT 1,                   -- failover order
  healthy boolean NOT NULL DEFAULT true,
  last_health_check timestamptz,
  float_balance_minor bigint,
  config jsonb
);

CREATE TABLE webhook_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor text NOT NULL,
  signature_valid boolean NOT NULL,
  raw jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  error text,
  received_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- RISK / LIMITS ----------
CREATE TABLE limits (
  id serial PRIMARY KEY,
  kyc_tier smallint NOT NULL,
  metric text NOT NULL,                              -- daily_spend|single_txn|weekly_spend|new_account_daily
  currency char(3) NOT NULL,
  max_minor bigint NOT NULL,
  UNIQUE (kyc_tier, metric, currency)
);

CREATE TABLE risk_flags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id),
  flag text NOT NULL,                                -- velocity|duplicate_photo|chargeback|manual
  detail jsonb, resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- REWARDS ----------
CREATE TABLE reward_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id),
  kind text NOT NULL,                                -- coins_earn|coins_redeem|streak_bonus|spin|referral|mission
  coins int NOT NULL DEFAULT 0,
  credit_minor bigint NOT NULL DEFAULT 0,            -- product credit granted (kobo)
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  actor text NOT NULL,                               -- user id | 'system' | admin id
  action text NOT NULL,
  entity text, entity_id text, detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- SEED: platform accounts + tier limits ----------
INSERT INTO ledger_accounts (owner_type, owner_id, currency, kind) VALUES
 ('platform', NULL, 'NGN', 'revenue'), ('platform', NULL, 'USD', 'revenue'),
 ('platform', NULL, 'NGN', 'expense'), ('platform', NULL, 'USD', 'expense'),
 ('platform', NULL, 'NGN', 'liability'),
 ('platform', NULL, 'NGN', 'reserve'), ('platform', NULL, 'USD', 'reserve'),
 ('platform', NULL, 'NGN', 'gateway'), ('platform', NULL, 'USD', 'gateway'),
 ('vendor',   NULL, 'NGN', 'float'),   ('vendor',   NULL, 'USD', 'float');

INSERT INTO limits (kyc_tier, metric, currency, max_minor) VALUES
 (1,'daily_spend','NGN',   5000000),   -- ₦50,000/day
 (1,'single_txn','NGN',    2000000),   -- ₦20,000
 (2,'daily_spend','NGN', 100000000),   -- ₦1,000,000/day
 (2,'single_txn','NGN',  50000000),
 (1,'new_account_daily','NGN', 1000000); -- ₦10,000/day first 72h
