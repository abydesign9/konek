-- Card products: the catalogue of card types a customer can create, each with
-- its own admin-editable fee schedule. A card references the product it was
-- issued under. Money is integer minor units; percentages are numeric percents.

CREATE TABLE card_products (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  text NOT NULL,
  currency              char(3) NOT NULL DEFAULT 'USD',   -- USD | NGN
  form_factor           text NOT NULL DEFAULT 'virtual',  -- virtual | physical
  brand                 text NOT NULL DEFAULT 'visa',     -- visa | mastercard
  description           text,
  creation_fee_minor    bigint NOT NULL DEFAULT 0,
  authorization_fee_minor bigint NOT NULL DEFAULT 0,      -- charged per card transaction
  funding_fee_pct       numeric(6,3) NOT NULL DEFAULT 0,  -- display only for wallet-linked cards
  funding_fee_min_minor bigint NOT NULL DEFAULT 0,
  funding_fee_max_minor bigint,
  decline_fee_minor     bigint NOT NULL DEFAULT 0,
  dispute_fee_minor     bigint NOT NULL DEFAULT 0,
  intl_fee_pct          numeric(6,3) NOT NULL DEFAULT 0,
  intl_fee_fixed_minor  bigint NOT NULL DEFAULT 0,
  active                boolean NOT NULL DEFAULT true,
  sort_order            int NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Each issued card records which product it came from (nullable for legacy cards).
ALTER TABLE cards ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES card_products(id);

-- Seed the reference catalogue (amounts in minor units; edit freely in admin).
INSERT INTO card_products
  (name, currency, form_factor, description, creation_fee_minor, authorization_fee_minor,
   funding_fee_pct, funding_fee_min_minor, funding_fee_max_minor, decline_fee_minor,
   dispute_fee_minor, intl_fee_pct, intl_fee_fixed_minor, sort_order)
VALUES
  ('Standard USD Card', 'USD', 'virtual', 'Everyday virtual dollar card for global spend.',
     300, 0, 1.000, 100, 500, 50, 5000, 2.500, 50, 1),
  ('Classic USD Card', 'USD', 'virtual', 'Wallet-linked dollar card, no funding step.',
     300, 80, 0, 0, NULL, 0, 5000, 2.000, 80, 2),
  ('Naira Card', 'NGN', 'virtual', 'Virtual naira card for local and online spend.',
     100000, 0, 0, 0, NULL, 0, 50000, 0, 0, 3),
  ('Physical USD Card', 'USD', 'physical', 'Physical dollar card, delivered to you.',
     1000, 0, 1.000, 100, 500, 50, 5000, 2.500, 50, 4);
