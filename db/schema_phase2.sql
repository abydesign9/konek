-- ============================================================
-- KONEK — Phase 2+ Schema  (Postgres)
-- Extends db/schema.sql (Phase 1). Apply AFTER schema.sql.
-- Covers every module NOT in Phase 1: dollar accounts, cards,
-- voice sessions, agents/B2B/white-label, full gamification,
-- notifications, admin console.
-- Do NOT apply this until the matching Phase 2+ feature is
-- actually being built — see docs/PHASE2_ROADMAP.md for gates.
-- ============================================================

-- ============================================================
-- M6 — VIRTUAL DOLLAR ACCOUNT (receive-only)
-- Partner: Fincra / Cadana / Sudo — partner holds the license.
-- ============================================================
CREATE TABLE virtual_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id),
  provider text NOT NULL,                       -- fincra|cadana|sudo
  provider_ref text NOT NULL,
  currency char(3) NOT NULL,                     -- USD (GBP/EUR later)
  account_number text NOT NULL,
  routing_number text,                           -- ABA / sort code / IBAN depending on provider+currency
  bank_name text,
  status text NOT NULL DEFAULT 'active',         -- active|suspended|closed
  kyc_tier_required smallint NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_ref)
);

CREATE TABLE virtual_account_inflows (            -- inbound wires/transfers landing on the account
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  virtual_account_id uuid NOT NULL REFERENCES virtual_accounts(id),
  txn_id uuid REFERENCES transactions(id),        -- links to the credit transaction once processed
  sender_name text, sender_bank text,
  amount_minor bigint NOT NULL,
  currency char(3) NOT NULL,
  provider_ref text NOT NULL,
  status text NOT NULL DEFAULT 'received',        -- received|credited|flagged|returned
  received_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- M7 — VIRTUAL CARD ISSUING
-- Partner: Sudo Africa / Union54 / Stripe Issuing (eligibility-dependent)
-- ============================================================
CREATE TABLE cards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id),
  provider text NOT NULL,                        -- sudo|union54|stripe_issuing
  provider_card_id text NOT NULL,
  card_type text NOT NULL DEFAULT 'virtual',      -- virtual|physical (physical = future)
  brand text NOT NULL,                            -- visa|mastercard
  last4 text NOT NULL,
  currency char(3) NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'active',          -- active|frozen|closed|compromised
  single_txn_limit_minor bigint,
  monthly_limit_minor bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_card_id)
);

CREATE TABLE card_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id uuid NOT NULL REFERENCES cards(id),
  txn_id uuid REFERENCES transactions(id),
  provider_ref text NOT NULL,
  merchant_name text, merchant_category text,
  amount_minor bigint NOT NULL,
  currency char(3) NOT NULL,
  status text NOT NULL DEFAULT 'authorized',      -- authorized|settled|declined|reversed
  decline_reason text,
  three_ds_challenge boolean NOT NULL DEFAULT false,
  three_ds_passed boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE card_disputes (                       -- chargebacks — deter friendly fraud per spec
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_transaction_id uuid NOT NULL REFERENCES card_transactions(id),
  user_id uuid NOT NULL REFERENCES users(id),
  reason text NOT NULL,
  dispute_fee_minor bigint NOT NULL DEFAULT 0,    -- ~20% deterrent fee per spec
  status text NOT NULL DEFAULT 'filed',           -- filed|under_review|won|lost
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- ============================================================
-- M8 — VOICE (loyalty bundle, not a profit center)
-- CPaaS: Twilio / Telnyx WebRTC
-- ============================================================
CREATE TABLE call_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id),
  provider text NOT NULL,                         -- twilio|telnyx
  provider_call_sid text NOT NULL,
  to_number text NOT NULL,
  duration_seconds int NOT NULL DEFAULT 0,
  cost_minor bigint NOT NULL DEFAULT 0,            -- what CPaaS charged us
  billed_minutes_from_bundle int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',        -- completed|failed|no_answer
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE minutes_bundles (                      -- earned loyalty minutes ("top up ₦X -> Y free minutes")
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id),
  minutes_granted int NOT NULL,
  minutes_used int NOT NULL DEFAULT 0,
  source text NOT NULL,                            -- topup_reward|mission|purchase
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- M9 — B2B: AGENTS, BUSINESSES (KYB), WHITE-LABEL, CORPORATE
-- ============================================================
CREATE TABLE agents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  tier text NOT NULL DEFAULT 'bronze',             -- bronze|silver|gold — better rates per tier
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.02,
  float_account_id uuid REFERENCES ledger_accounts(id),
  status text NOT NULL DEFAULT 'active',           -- pending|active|suspended
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE agent_commissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id uuid NOT NULL REFERENCES agents(id),
  source_txn_id uuid REFERENCES transactions(id),  -- the downstream sale that earned commission
  amount_minor bigint NOT NULL,
  currency char(3) NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE business_accounts (                    -- KYB tier ("Tier B")
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id uuid NOT NULL REFERENCES users(id),
  legal_name text NOT NULL,
  reg_number text,                                 -- CAC number etc.
  reg_country text NOT NULL DEFAULT 'NG',
  kyb_status text NOT NULL DEFAULT 'pending',       -- pending|verified|rejected
  business_type text NOT NULL,                      -- sme|hr_bulk|reward_platform|travel_corporate|white_label
  monthly_limit_minor bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE business_directors (                   -- KYB identity docs
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_account_id uuid NOT NULL REFERENCES business_accounts(id),
  full_name text NOT NULL,
  id_doc_ref text,
  verified boolean NOT NULL DEFAULT false
);

CREATE TABLE bulk_batches (                         -- CSV bulk VTU / rewards disbursement
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_account_id uuid NOT NULL REFERENCES business_accounts(id),
  purpose text NOT NULL,                            -- staff_data|csr|rewards|payroll_topup
  total_items int NOT NULL DEFAULT 0,
  total_amount_minor bigint NOT NULL DEFAULT 0,
  currency char(3) NOT NULL,
  status text NOT NULL DEFAULT 'uploaded',          -- uploaded|validated|processing|completed|failed
  uploaded_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE bulk_batch_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id uuid NOT NULL REFERENCES bulk_batches(id),
  recipient jsonb NOT NULL,                         -- {phone, network, amount...}
  txn_id uuid REFERENCES transactions(id),
  status text NOT NULL DEFAULT 'pending',           -- pending|delivered|failed
  error text
);

CREATE TABLE partner_accounts (                      -- white-label API partners (Phase 2+)
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_account_id uuid NOT NULL REFERENCES business_accounts(id),
  partner_name text NOT NULL,                        -- e.g. an FXBud-style remittance app
  api_key_hash text NOT NULL,
  revenue_share_pct numeric(5,4) NOT NULL DEFAULT 0.20,
  allowed_services text[] NOT NULL DEFAULT '{airtime,data,esim}',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE corporate_travel_orders (               -- corporate eSIM packages
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_account_id uuid NOT NULL REFERENCES business_accounts(id),
  batch_id uuid REFERENCES bulk_batches(id),
  traveler_name text, traveler_email text,
  destination_country text NOT NULL,
  catalog_item_id uuid REFERENCES catalog_items(id),
  txn_id uuid REFERENCES transactions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- M10 — FULL GAMIFICATION (extends reward_events from Phase 1)
-- ============================================================
CREATE TABLE user_coin_balances (                    -- cached; source of truth = SUM(reward_events.coins)
  user_id uuid PRIMARY KEY REFERENCES users(id),
  coins int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE streaks (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  current_streak_weeks int NOT NULL DEFAULT 0,
  longest_streak_weeks int NOT NULL DEFAULT 0,
  last_qualifying_txn_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE levels (                                 -- config: Bronze/Silver/Gold thresholds + perks
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,                          -- bronze|silver|gold
  min_lifetime_spend_minor bigint NOT NULL,
  currency char(3) NOT NULL DEFAULT 'NGN',
  perk_discount_pct numeric(5,4) NOT NULL DEFAULT 0
);

CREATE TABLE user_levels (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  level_id int NOT NULL REFERENCES levels(id),
  achieved_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE missions (                               -- config: "try your first eSIM = 500 coins"
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  coin_reward int NOT NULL,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE user_missions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id),
  mission_id uuid NOT NULL REFERENCES missions(id),
  status text NOT NULL DEFAULT 'in_progress',         -- in_progress|completed|claimed
  completed_at timestamptz,
  UNIQUE (user_id, mission_id)
);

CREATE TABLE leaderboard_snapshots (                  -- weekly cache for fast reads
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_start date NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id),
  rank int NOT NULL,
  score_minor bigint NOT NULL,
  prize_minor bigint,
  UNIQUE (period_start, user_id)
);

CREATE TABLE squads (                                 -- "your church group" / community goals
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE squad_members (
  squad_id uuid NOT NULL REFERENCES squads(id),
  user_id uuid NOT NULL REFERENCES users(id),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (squad_id, user_id)
);

CREATE TABLE squad_goals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  squad_id uuid NOT NULL REFERENCES squads(id),
  period_start date NOT NULL,
  target_txn_count int NOT NULL,
  current_txn_count int NOT NULL DEFAULT 0,
  reward_desc text,                                   -- "everyone gets 1GB"
  fulfilled boolean NOT NULL DEFAULT false
);

CREATE TABLE referral_codes (
  code text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE referral_conversions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_code text NOT NULL REFERENCES referral_codes(code),
  referred_user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  referrer_credit_minor bigint NOT NULL DEFAULT 0,
  referred_credit_minor bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',             -- pending|qualified|paid (qualifies on first txn)
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- M11 — NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id),
  channel text NOT NULL,                              -- push|sms|email|whatsapp
  kind text NOT NULL,                                 -- txn_receipt|price_alert|streak_reminder|support
  title text, body text,
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  push_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  price_alerts boolean NOT NULL DEFAULT true
);

-- ============================================================
-- M12 — ADMIN CONSOLE
-- ============================================================
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'support',               -- support|kyc_reviewer|risk|finance|super_admin
  active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz                          -- automated offboarding target, per spec risk rule
);

CREATE TABLE fraud_queue (                             -- working queue on top of risk_flags
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_flag_id uuid NOT NULL REFERENCES risk_flags(id),
  assigned_admin_id uuid REFERENCES admin_users(id),
  priority text NOT NULL DEFAULT 'medium',            -- low|medium|high|critical
  status text NOT NULL DEFAULT 'open',                -- open|in_review|resolved|escalated
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE reconciliation_runs (                      -- ledger vs vendor statement diff jobs
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor text NOT NULL,
  period_start date NOT NULL, period_end date NOT NULL,
  ledger_total_minor bigint NOT NULL,
  vendor_total_minor bigint NOT NULL,
  drift_minor bigint NOT NULL,                          -- should be 0
  status text NOT NULL DEFAULT 'completed',
  run_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SEED: Phase 2 reference data
-- ============================================================
INSERT INTO levels (name, min_lifetime_spend_minor, currency, perk_discount_pct) VALUES
 ('bronze', 0,        'NGN', 0.000),
 ('silver', 5000000,  'NGN', 0.010),   -- ₦50,000 lifetime
 ('gold',   20000000, 'NGN', 0.020);   -- ₦200,000 lifetime

INSERT INTO missions (code, title, coin_reward) VALUES
 ('first_esim', 'Try your first eSIM', 500),
 ('first_intl_topup', 'Send your first international top-up', 300),
 ('first_electricity', 'Pay your first electricity bill', 200),
 ('refer_a_friend', 'Refer a friend who transacts', 400);
