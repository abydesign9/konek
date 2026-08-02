-- Campaigns: group distributions under a shared budget and timeline instead of
-- tracking one-off batches. A campaign is just a label + optional budget cap;
-- linked bulk_batches roll up into it for spend-vs-budget reporting.
CREATE TABLE business_campaigns (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_account_id uuid NOT NULL REFERENCES business_accounts(id),
  created_by         uuid NOT NULL REFERENCES users(id),
  name               text NOT NULL,
  description        text,
  budget_minor       bigint,                        -- null = no cap, just a grouping
  currency           char(3) NOT NULL DEFAULT 'NGN',
  start_date         date,
  end_date           date,
  status             text NOT NULL DEFAULT 'active', -- active|completed|archived
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX business_campaigns_business_idx ON business_campaigns (business_account_id, created_at DESC);

ALTER TABLE bulk_batches ADD COLUMN campaign_id uuid REFERENCES business_campaigns(id);
CREATE INDEX bulk_batches_campaign_idx ON bulk_batches (campaign_id) WHERE campaign_id IS NOT NULL;

-- API keys: programmatic access for a business, separate from HR/ops user
-- sessions. Only the key's SHA-256 hash is stored (same principle as password
-- hashing) — the plaintext key is shown once, at creation, and never again.
CREATE TABLE business_api_keys (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_account_id uuid NOT NULL REFERENCES business_accounts(id),
  created_by         uuid NOT NULL REFERENCES users(id),
  label              text NOT NULL,
  key_prefix         text NOT NULL,                  -- first chars shown in the UI, e.g. "knk_live_ab12"
  key_hash           text NOT NULL UNIQUE,            -- sha256(full key)
  mode               text NOT NULL DEFAULT 'sandbox',  -- sandbox|live
  status             text NOT NULL DEFAULT 'active',   -- active|revoked
  last_used_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  revoked_at         timestamptz
);
CREATE INDEX business_api_keys_business_idx ON business_api_keys (business_account_id, created_at DESC);

-- Log of every API-key-authenticated call, shown to the business as their
-- "webhook/API log" (the API surface being self-served, there's no third-party
-- webhook to log yet — this is the equivalent visibility into their own calls).
CREATE TABLE business_api_requests (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_api_key_id uuid NOT NULL REFERENCES business_api_keys(id),
  method             text NOT NULL,
  path               text NOT NULL,
  status_code        int NOT NULL,
  detail             jsonb NOT NULL DEFAULT '{}',
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX business_api_requests_key_idx ON business_api_requests (business_api_key_id, created_at DESC);
