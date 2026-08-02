-- Notification preferences (alerts for failed distributions / low wallet
-- balance) and a brand mark (shown across the hub and on distribution
-- receipts) — both settled features, not needing any external provider.
ALTER TABLE business_accounts
  ADD COLUMN notify_failed_distributions boolean NOT NULL DEFAULT true,
  ADD COLUMN notify_low_balance boolean NOT NULL DEFAULT true,
  ADD COLUMN low_balance_threshold_minor bigint NOT NULL DEFAULT 500000, -- ₦5,000
  ADD COLUMN brand_emoji text;
