-- Full business hub: dedicated NGN/USD receiving accounts, virtual cards, and
-- vendor bank transfers for a business_account — the business equivalent of a
-- customer's virtual_accounts / cards / withdrawals. Kept as PARALLEL tables
-- (business_account_id, not user_id) rather than widening the personal
-- money-movement tables: those are hardened, signed-off, and every query on
-- them assumes a single user owner. Reusing the same adapter pattern (mock
-- today, same interface a real provider drops into later) keeps behaviour
-- identical to the personal flows.

-- ---- Dedicated receiving accounts (NGN + USD) ----
CREATE TABLE business_virtual_accounts (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_account_id uuid NOT NULL REFERENCES business_accounts(id),
  provider           text NOT NULL,
  provider_ref       text NOT NULL,
  currency           char(3) NOT NULL,               -- NGN|USD
  account_number     text NOT NULL,
  routing_number     text,
  bank_name          text,
  status             text NOT NULL DEFAULT 'active',  -- active|suspended|closed
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_ref),
  UNIQUE (business_account_id, currency)
);

CREATE TABLE business_virtual_account_inflows (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_virtual_account_id uuid NOT NULL REFERENCES business_virtual_accounts(id),
  sender_name              text, sender_bank text,
  amount_minor             bigint NOT NULL,
  currency                 char(3) NOT NULL,
  provider_ref             text NOT NULL UNIQUE,
  status                   text NOT NULL DEFAULT 'credited',
  received_at              timestamptz NOT NULL DEFAULT now()
);

-- ---- Virtual cards ----
CREATE TABLE business_cards (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_account_id uuid NOT NULL REFERENCES business_accounts(id),
  created_by         uuid NOT NULL REFERENCES users(id),
  label              text,                            -- e.g. "Ops team card"
  provider           text NOT NULL,
  provider_card_id   text NOT NULL,
  card_type          text NOT NULL DEFAULT 'virtual',
  brand              text NOT NULL,
  last4              text NOT NULL,
  currency           char(3) NOT NULL DEFAULT 'USD',
  status             text NOT NULL DEFAULT 'active',   -- active|frozen|closed
  single_txn_limit_minor bigint,
  monthly_limit_minor    bigint,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_card_id)
);
CREATE INDEX business_cards_business_idx ON business_cards (business_account_id, created_at DESC);

CREATE TABLE business_card_transactions (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_card_id uuid NOT NULL REFERENCES business_cards(id),
  provider_ref   text NOT NULL,
  merchant_name  text,
  amount_minor   bigint NOT NULL,
  currency       char(3) NOT NULL,
  status         text NOT NULL DEFAULT 'authorized',   -- authorized|settled|declined
  decline_reason text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX business_card_txns_card_idx ON business_card_transactions (business_card_id, created_at DESC);

-- ---- Vendor transfers (bank payouts to saved payees, business's own money) ----
CREATE TABLE business_vendors (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_account_id uuid NOT NULL REFERENCES business_accounts(id),
  created_by         uuid NOT NULL REFERENCES users(id),
  name               text NOT NULL,                    -- vendor's display name
  bank_code          text NOT NULL,
  bank_name          text NOT NULL,
  account_name       text NOT NULL,
  account_number_encrypted jsonb NOT NULL,
  account_number_last4     text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_account_id, bank_code, account_number_last4)
);
CREATE INDEX business_vendors_business_idx ON business_vendors (business_account_id, created_at DESC);

CREATE TABLE business_vendor_transfers (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_account_id uuid NOT NULL REFERENCES business_accounts(id),
  vendor_id          uuid NOT NULL REFERENCES business_vendors(id),
  initiated_by       uuid NOT NULL REFERENCES users(id),
  idempotency_key    text NOT NULL,
  amount_minor       bigint NOT NULL,
  currency           char(3) NOT NULL DEFAULT 'NGN',
  status             text NOT NULL DEFAULT 'initiated', -- initiated|pending_vendor|delivered|failed
  vendor_ref         text,
  failure_reason     text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_account_id, idempotency_key)
);
CREATE INDEX business_vendor_transfers_business_idx ON business_vendor_transfers (business_account_id, created_at DESC);

-- ---- Unified business wallet activity feed (funding, inflows, card spend, vendor transfers) ----
CREATE TABLE business_wallet_events (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_account_id uuid NOT NULL REFERENCES business_accounts(id),
  actor_user_id      uuid REFERENCES users(id),          -- null for inbound provider credits
  kind               text NOT NULL,                      -- owner_topup|dollar_inflow|naira_inflow|card_fee|card_spend|vendor_transfer
  amount_minor       bigint NOT NULL,
  currency           char(3) NOT NULL,
  description        text NOT NULL,
  status             text NOT NULL DEFAULT 'completed',   -- completed|pending|failed
  ref                jsonb NOT NULL DEFAULT '{}',
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX business_wallet_events_business_idx ON business_wallet_events (business_account_id, created_at DESC);
