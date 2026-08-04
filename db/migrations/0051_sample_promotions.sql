-- Sample promotions so the admin can see how each promo type is configured.
-- They are created PAUSED (status='paused') on purpose: they demonstrate the
-- fields without actually granting rewards until an admin reviews and activates
-- them. Idempotent — only inserted if a promo with that name doesn't exist.

INSERT INTO promotions (name, promo_type, reward_type, target_audience, reward_amount_minor, reward_currency,
                        cashback_pct, min_deposit_minor, min_spend_minor, valid_spend_types, user_cap, status, notification_message)
SELECT 'Welcome bonus (sample)', 'signup', 'wallet_locked', 'ALL', 100000, 'NGN',
       NULL, 500000, 200000, ARRAY['airtime','data','esim'], 1, 'paused',
       'Welcome to Konek! Here is ₦1,000 to get started — unlock it by funding ₦5,000 and spending ₦2,000.'
WHERE NOT EXISTS (SELECT 1 FROM promotions WHERE name = 'Welcome bonus (sample)');

INSERT INTO promotions (name, promo_type, reward_type, target_audience, reward_amount_minor, reward_currency,
                        cashback_pct, min_deposit_minor, min_spend_minor, valid_spend_types, user_cap, status, notification_message)
SELECT 'First deposit boost (sample)', 'first_deposit', 'wallet_locked', 'ALL', 200000, 'NGN',
       NULL, 1000000, 0, ARRAY[]::text[], 1, 'paused',
       'Fund ₦10,000 or more on your first deposit and get a ₦2,000 bonus.'
WHERE NOT EXISTS (SELECT 1 FROM promotions WHERE name = 'First deposit boost (sample)');

INSERT INTO promotions (name, promo_type, reward_type, target_audience, reward_amount_minor, reward_currency,
                        cashback_pct, min_deposit_minor, min_spend_minor, valid_spend_types, user_cap, status, notification_message)
SELECT 'Card spend cashback (sample)', 'card_cashback', 'cashback_percent', 'ALL', 0, 'NGN',
       2.000, 0, 0, ARRAY['card_spend'], NULL, 'paused',
       'Earn 2% cashback every time you spend with your Konek card.'
WHERE NOT EXISTS (SELECT 1 FROM promotions WHERE name = 'Card spend cashback (sample)');

INSERT INTO promotions (name, promo_type, reward_type, target_audience, reward_amount_minor, reward_currency,
                        cashback_pct, min_deposit_minor, min_spend_minor, valid_spend_types, user_cap, status, notification_message)
SELECT 'Free first card (sample)', 'card_creation', 'card_fee_waiver', 'ALL', 0, 'NGN',
       NULL, 0, 0, ARRAY[]::text[], 1, 'paused',
       'Create your first virtual card with no creation fee.'
WHERE NOT EXISTS (SELECT 1 FROM promotions WHERE name = 'Free first card (sample)');

INSERT INTO promotions (name, promo_type, reward_type, target_audience, reward_amount_minor, reward_currency,
                        cashback_pct, min_deposit_minor, min_spend_minor, valid_spend_types, user_cap, status, notification_message)
SELECT 'Refer & earn (sample)', 'referral', 'wallet_instant', 'ALL', 500000, 'NGN',
       NULL, 0, 0, ARRAY[]::text[], NULL, 'paused',
       'Invite a friend — when they join and transact, you both get ₦5,000.'
WHERE NOT EXISTS (SELECT 1 FROM promotions WHERE name = 'Refer & earn (sample)');
