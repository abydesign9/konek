-- Seed a starter knowledge base for the public /faq page and in-app support.
-- Idempotent: each row is only inserted if no FAQ with that exact question
-- already exists, so re-running the migration (or editing FAQs in admin) is safe.
INSERT INTO faq_articles (category, question, answer, published)
SELECT v.category, v.question, v.answer, true
FROM (VALUES
  ('Getting started',
   'What is Raviion?',
   'Raviion is one app for global money and connectivity. You can hold multiple currencies, spend with virtual cards, buy eSIM data, and pay everyday bills like airtime, data, electricity and cable — all in one place. Raviion is a product of Topton Global Consult.'),
  ('Getting started',
   'Who can use Raviion?',
   'Raviion is built for Africans at home and abroad, and for anyone who needs to receive money globally and stay connected. You can sign up with your email and phone number and verify your identity to unlock funding, accounts and cards.'),
  ('Getting started',
   'How do I create an account?',
   'Download or open Raviion, sign up with your email and password, confirm your phone number, and complete a quick identity verification. Once verified you can fund your wallet and start using every feature.'),

  ('Accounts',
   'Which currencies can I hold?',
   'You can hold Naira (NGN) and US Dollars (USD), with British Pounds (GBP) and Euros (EUR) available as balances. You can convert between currencies inside the app when the rate suits you.'),
  ('Accounts',
   'Can I get a USD account in my own name?',
   'Yes. After verification you can open a USD account in your name — even as a non-US resident — and share the details to receive payments from clients and platforms worldwide.'),
  ('Accounts',
   'Can I send money to another person on Raviion?',
   'Raviion focuses on receiving, holding, spending and withdrawing your own money. Person-to-person transfers are not offered. You can withdraw to your own bank account at any time.'),

  ('Cards',
   'How do I get a virtual card?',
   'Once you are verified, you can create a virtual card in seconds from the Cards section and fund it from your wallet. Use it for online shopping, subscriptions, ads and other international payments.'),
  ('Cards',
   'Why was my card declined?',
   'Common reasons are insufficient card balance, a merchant that does not accept the card type, or a security check. Make sure the card is funded and not frozen; if it keeps happening, contact support in the app.'),
  ('Cards',
   'Can I freeze my card?',
   'Yes. You can freeze and unfreeze your virtual card instantly from the Cards section. Freezing blocks new charges without cancelling the card.'),

  ('eSIM & Connectivity',
   'What is an eSIM and how does it work?',
   'An eSIM is a digital SIM built into your phone. With Raviion you pick a destination and data plan, install the eSIM, and switch it on when you arrive — keeping your normal number for calls and texts. No physical SIM swap and no roaming bill surprises.'),
  ('eSIM & Connectivity',
   'Which countries does the eSIM cover?',
   'Raviion offers local, regional and global eSIM data plans covering 190+ countries. Choose the plan that matches your trip in the app.'),
  ('eSIM & Connectivity',
   'What bills and top-ups can I pay?',
   'You can buy airtime and data for any major network, pay electricity and cable TV, buy exam pins (WAEC, NECO, JAMB), send international top-ups, and buy gift cards — all from one place.'),

  ('Funding & Withdrawals',
   'How do I add money to my wallet?',
   'You can fund your wallet by card or bank transfer, or by receiving money into your dedicated account number. Funding requires a verified account.'),
  ('Funding & Withdrawals',
   'How do I withdraw my money?',
   'You can withdraw to your own bank account from the wallet. Withdrawals require a higher verification tier for your security, and the amount is subject to your account limits.'),
  ('Funding & Withdrawals',
   'How long do transactions take?',
   'Most airtime, data and eSIM purchases are instant. Funding and withdrawals depend on the payment rail and any security checks; if something looks stuck, check your transaction history or contact support.'),

  ('Verification (KYC)',
   'Why do I need to verify my identity?',
   'Verification confirms you are you. It keeps your money safe, meets regulatory requirements, and unlocks funding, accounts and cards. We only ask for what your country requires, and your details are encrypted.'),
  ('Verification (KYC)',
   'What documents do I need?',
   'It depends on your country. In Nigeria we use your BVN or NIN for the first tier and a government ID plus a selfie for higher tiers. Other countries use their own government-issued ID. Raviion never forces non-Nigerian customers through Nigerian requirements.'),
  ('Verification (KYC)',
   'How long does verification take?',
   'Number checks like BVN or NIN are usually instant. Document and selfie reviews are typically quick but can take longer at busy times. You will be notified as soon as your tier updates.'),

  ('Security',
   'How does Raviion keep my money and data safe?',
   'Raviion uses encryption for sensitive data, transaction PINs, device and session controls, and continuous fraud monitoring. Money moves on a double-entry ledger that cannot create funds from nothing, and every payment is processed exactly once.'),
  ('Security',
   'What should I do if I notice suspicious activity?',
   'Change your password, review and log out of any sessions you do not recognise from Settings, and contact our support team in the app right away. We are available 24/7.'),
  ('Security',
   'Will Raviion ever ask for my password or PIN?',
   'Never. Raviion staff will never ask for your password, transaction PIN or one-time codes. If someone does, it is a scam — do not share them.'),

  ('Programs',
   'How do the Campus Ambassador, Influencer and Creator Club programs work?',
   'These are community programs for students, creators and influencers who want to represent Raviion and earn. You apply through the form on each program page; our team reviews every application and reaches out by email if it is a match.'),
  ('Programs',
   'How do referrals work?',
   'Share your invite link from the app. When a friend joins and starts transacting, you earn a reward paid to your wallet. There is no limit to how many people you can invite.')
) AS v(category, question, answer)
WHERE NOT EXISTS (SELECT 1 FROM faq_articles f WHERE f.question = v.question);
