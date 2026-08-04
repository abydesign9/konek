-- Editable content pages (a small CMS). Each page is a slug + title + subtitle +
-- an ordered list of sections, edited from the admin dashboard and rendered as a
-- public page on the site. Section body is plain text: lines beginning with
-- "- " render as bullets, blank lines separate paragraphs (no raw HTML, so it
-- can't be used for injection).
CREATE TABLE content_pages (
  slug        text PRIMARY KEY,
  title       text NOT NULL,
  subtitle    text,
  sections    jsonb NOT NULL DEFAULT '[]',   -- [{label, heading, body}]
  published   boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid
);

INSERT INTO content_pages (slug, title, subtitle, sections) VALUES (
  'about',
  'The connected wallet for Nigerians at home, in the diaspora, and the world.',
  'Airtime, data, bills, eSIM travel data, a multi-currency wallet, virtual accounts and virtual cards — in one app, built on a real accounting ledger with country-aware verification.',
  $j$[
    {
      "label": "What it is",
      "heading": "One place to stay connected and move money",
      "body": "Konek is a Nigerian diaspora-and-local fintech app. It brings connectivity and payments together: airtime, data, cable, electricity, exam pins, betting, eSIM travel data, a multi-currency wallet, dedicated account numbers and virtual cards.\n\nA global app with a Nigerian heart. Nigerians at home, Nigerians abroad, and international customers all get the right local experience."
    },
    {
      "label": "The product",
      "heading": "What customers can do",
      "body": "- Hold and spend in Naira, with USD (and later GBP/EUR) balances\n- Fund by card or bank, or receive transfers into a dedicated account number\n- Buy airtime, data, cable, electricity, exam pins, betting and international top-up\n- eSIM travel data for 190+ countries, delivered instantly\n- Dedicated Naira and USD account numbers that credit the wallet\n- Virtual USD and Naira cards, virtual and physical, for online spend\n- Withdraw to their own bank account\n- Earn rewards and referral bonuses"
    },
    {
      "label": "Verification",
      "heading": "Tiered KYC, in plain language",
      "body": "Customers verify only as much as the feature needs, and only what their own country requires.\n\n- Browse: sign up and look around, no money movement\n- Transact: a verified ID unlocks funding, bills, data and eSIM\n- Finance: ID plus a selfie unlocks USD accounts, cards and withdrawals\n\nNigeria uses BVN or NIN; every other country uses its own government ID. International and diaspora customers are never forced through Nigerian rules."
    },
    {
      "label": "How money works",
      "heading": "Safety built into the accounting",
      "body": "- A double-entry ledger means the books always reconcile\n- The database rejects any money created from nothing\n- Purchases reserve funds, then settle on delivery or return them on failure\n- Every payment and payout is exactly-once, so retries never double-charge\n- Incoming payments are re-checked with the provider before crediting\n- Every change is audited; financial records are reversed, never deleted"
    },
    {
      "label": "For compliance",
      "heading": "Risk and regulatory posture",
      "body": "- Tiered KYC gates features and limits, configurable per country and product\n- Per-tier transaction limits enforced on every spend\n- Fraud monitoring with risk flags, a review queue and alerts\n- A flagged identity auto-freezes the account and alerts admin\n- IDs, BVN/NIN and card details are encrypted; documents stored privately\n\nMoney-transmission licensing sits with our regulated payment, card and account partners; Konek integrates with them."
    },
    {
      "label": "For growth",
      "heading": "Levers you control",
      "body": "- A promotions engine: signup, deposit, card, cashback and milestone promos, with locked bonuses that unlock on activity, budgets, caps and live ROI reports\n- Referrals for customers who invite friends\n- An agent programme: affiliates, ambassadors and partners earn commission on referred customers plus fee waivers, higher limits and priority\n- Central pricing for eSIM and the catalogue"
    }
  ]$j$::jsonb
);
