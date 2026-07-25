-- Configurable promotions engine + a locked bonus wallet.
--
-- Promos grant rewards on defined triggers (signup, first deposit, virtual
-- account activation, card creation, card spend cashback, milestone, referral,
-- seasonal). Cash rewards land in the user's BONUS ledger account (kind='bonus')
-- and are locked until the promo's unlock conditions (minimum deposit + minimum
-- qualifying spend) are met, at which point they move to the main wallet and
-- become withdrawable. Money is always integer minor units.

CREATE TABLE promotions (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 text NOT NULL,
  promo_type           text NOT NULL,        -- signup|first_deposit|va_activation|card_creation|card_cashback|referral|milestone|seasonal|custom
  reward_type          text NOT NULL,        -- wallet_locked|wallet_instant|free_card|card_fee_waiver|cashback_percent|fee_discount|va_upgrade
  target_audience      text NOT NULL DEFAULT 'ALL',  -- NG|INTL|ALL
  reward_amount_minor  bigint NOT NULL DEFAULT 0,
  reward_currency      char(3) NOT NULL DEFAULT 'NGN',
  cashback_pct         numeric(6,3),         -- for card_cashback / cashback_percent
  min_deposit_minor    bigint NOT NULL DEFAULT 0,
  min_spend_minor      bigint NOT NULL DEFAULT 0,
  valid_spend_types    text[] NOT NULL DEFAULT '{}',  -- airtime,data,cable,electricity,esim,card_spend,va_inflow,...
  milestone_minor      bigint,               -- cumulative threshold for milestone promos
  start_date           timestamptz NOT NULL DEFAULT now(),
  end_date             timestamptz,
  reward_expiry_days   integer,              -- locked reward lapses this many days after grant
  user_cap             integer,              -- max claims per user (usually 1)
  budget_cap_minor     bigint,               -- stop granting once total_paid_out reaches this
  total_claimed        integer NOT NULL DEFAULT 0,
  total_paid_out_minor bigint NOT NULL DEFAULT 0,
  status               text NOT NULL DEFAULT 'active',  -- active|paused|expired|scheduled
  notification_message text,
  created_by           uuid,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX promotions_active ON promotions (promo_type, status);

CREATE TABLE promo_claims (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_id              uuid NOT NULL REFERENCES promotions(id),
  user_id               uuid NOT NULL REFERENCES users(id),
  status                text NOT NULL DEFAULT 'granted_locked',  -- granted_locked|unlocked|expired
  reward_amount_minor   bigint NOT NULL DEFAULT 0,
  reward_currency       char(3) NOT NULL DEFAULT 'NGN',
  deposit_progress_minor bigint NOT NULL DEFAULT 0,
  spend_progress_minor   bigint NOT NULL DEFAULT 0,
  unlocked_at           timestamptz,
  expires_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (promo_id, user_id)
);
CREATE INDEX promo_claims_user ON promo_claims (user_id, status);

-- Permission to run promotions.
INSERT INTO admin_permissions (key, type_key, label)
  VALUES ('promotions.manage', 'marketing', 'Create and manage promotions')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO admin_role_permissions (role_name, permission_key)
  VALUES ('super_admin', 'promotions.manage')
  ON CONFLICT DO NOTHING;
