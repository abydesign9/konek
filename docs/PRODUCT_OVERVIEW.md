# Konek — Product Overview

A shareable overview of what Konek is and does, for co-founders, growth,
compliance and the wider team. Plain language, no code. For engineering detail
see `HANDOVER.md`.

Status: pre-launch, targeting September. Everything below is built and running on
the platform; live payment/verification providers are switched on as their
accounts are approved.

---

## 1. What Konek is

Konek is a Nigerian diaspora-and-local fintech app. One place to stay connected
and move money: airtime, data, cable, electricity, exam pins, betting, eSIM
travel data, a multi-currency wallet, virtual accounts and virtual cards. It runs
as an installable web app (PWA) today, with an App Store / Play Store version
planned.

Positioning: a global app with a Nigerian heart. Nigerians at home, Nigerians in
the diaspora, and international customers can all use it, each with the right
local experience.

---

## 2. Who it is for

- Local Nigerian customers buying airtime, data, bills, eSIM and cards.
- Diaspora Nigerians who want a familiar home for payments and travel data.
- International customers, especially for eSIM, which needs almost no friction.
- Agents: affiliates, campus ambassadors and marketing partners who refer
  customers and earn commission.

---

## 3. What customers can do

- Wallet: hold and spend in Naira, with USD (and later GBP/EUR) balances.
- Fund the wallet: card/bank via Paystack, or receive transfers into a dedicated
  virtual account number.
- Buy connectivity: airtime, data, cable TV, electricity, exam pins, betting,
  international top-up.
- eSIM: travel data for 190+ countries, delivered instantly, sourced from
  multiple suppliers behind one clean listing (best price, automatic failover).
- Virtual accounts: a dedicated Naira account number (and USD/foreign receiving
  accounts) so anyone can pay the customer and it lands in their wallet.
- Virtual cards: create USD or Naira cards (virtual and physical) to spend
  online worldwide. Freeze, set limits, reveal details, dispute a charge.
- Withdraw: send money out to the customer's own bank account.
- Rewards and referrals: coins, streaks, daily spin, and referral rewards.
- Support: in-app help, live chat, FAQs.

Boundaries by design (important for compliance): no peer-to-peer transfers to
other people, no third-party remittance, no airtime-to-cash. Gift cards are
buy-only. Withdrawals go only to the customer's own bank.

---

## 4. Verification (KYC) in plain language

Konek uses tiered, progressive verification. Customers verify only as much as the
feature they want requires, and only what their country's regulator requires.

- Tier 0 (Browse): sign up and look around. No money movement.
- Tier 1 (Transact): a verified ID unlocks funding, bills, data and eSIM.
- Tier 2 (Finance): ID plus a selfie unlocks USD accounts, cards and withdrawals.

Global by country: Nigeria uses BVN or NIN; every other country uses its own
government ID (passport, national ID, driver's licence) — never Nigerian BVN/NIN.
So international customers and diaspora Nigerians are not blocked by Nigerian
rules. The requirement matrix is configurable per country from the admin
dashboard, and new countries or verification providers are added as data, not
code.

---

## 5. How money and safety work (for compliance)

- Double-entry ledger: every movement is recorded as a balanced accounting entry.
  Balances are derived from those entries, so the books always reconcile.
- No money from nothing: a database rule rejects any unbalanced movement.
- Reserve, settle, release: a purchase holds funds, then settles on delivery or
  returns them on failure. Wallets can never go negative.
- Exactly once: every payment and payout is idempotent — retries and duplicate
  webhooks can never double-charge or double-pay.
- Verify, never trust: incoming payment notifications are re-checked directly with
  the provider before any wallet is credited, and every webhook signature is
  verified.
- Full audit trail: every state change is logged with who did it. Financial
  records are never deleted, only reversed.

---

## 6. Compliance and risk posture

- Tiered KYC gates features and limits (see section 4), configurable per country
  and per product.
- Transaction limits per verification tier and currency, enforced on every spend
  and editable in the admin dashboard.
- Velocity and fraud monitoring: unusual activity raises risk flags and a fraud
  queue, with alerts.
- Fraud auto-freeze: if a verification provider flags an identity as fraudulent or
  mismatched, the account is automatically frozen (access revoked, money stopped)
  and admin is alerted, pending review.
- Data protection: sensitive personal data (IDs, BVN/NIN, card details) is
  encrypted at rest; KYC documents are stored privately. Nothing sensitive is
  exposed to the customer's browser or written to logs.
- Provider separation: production and sandbox provider keys are kept separate and
  live only in the secure environment, never in the code or database.
- Card controls: gambling/adult/crypto blocking and international fees are set up
  for when the card issuer provides the needed transaction data.

Money-transmission licensing sits with our regulated partners (payment, card and
account providers); Konek integrates with them.

---

## 7. Growth levers (for growth/marketing)

- Promotions engine: run signup, first-deposit, virtual-account, card, cashback
  and milestone promos. Rewards can be instant or locked in a bonus wallet that
  unlocks once the customer deposits and spends. Budgets, per-user caps, expiry
  and audience (Nigeria / international / all) are all configurable, with live
  reports on claims, unlock rate, payout and ROI.
- Referrals: customers earn for referring friends who transact.
- Agent programme: affiliates, campus ambassadors and marketing partners refer
  customers and earn commission on those customers' purchases across the whole
  catalogue. Agents also get perks: card-fee waivers/discounts, higher limits and
  priority. The commission rate, perks and a master on/off switch are all set in
  the admin dashboard.
- Marketplace pricing: eSIM and catalogue prices are managed centrally with
  tiered markup rules, promos and CSV/import tools.

---

## 8. What the team can control from the admin dashboard

Everything commercial is tunable without engineering:

- Prices and markups (rates, marketplace, per operator).
- Transaction limits per tier and currency; fees; account rules.
- Card products and their full fee schedules (creation, dispute, etc.).
- Promotions (create, pause, budgets, reports).
- Agent programme (commission, perks, on/off).
- KYC requirements and providers per country.
- Customers (search, suspend, block, close), funding reconciliation, fraud
  blocking, support, notifications, vendor health.
- Role-based admin access: each admin has a role, each action checks a permission,
  and everything is audited.

Admins sign in with their own Konek account (email + password) plus an admin
grant — no shared password.

---

## 9. Platforms

- Today: installable web app (PWA). Opens full-screen to a splash then login,
  with push notifications and biometric-assisted access.
- Later: App Store / Play Store apps wrapping the same product and backend, so
  there is one codebase and one source of truth.

---

## 10. Security summary (for co-founders / compliance)

- No secrets or provider keys are ever sent to the customer's browser; the app
  can only talk to our own backend (enforced by a strict browser security policy).
- All third-party calls (payments, eSIM, KYC) happen server-side.
- Standard protections are in place: encrypted data at rest, signed and verified
  webhooks, rate limiting on sensitive and money-moving actions, brute-force
  protection on codes and logins, hardened session cookies, and security headers
  (clickjacking, content-type, transport security).
- Regular internal security reviews are part of the workflow.

---

## 11. Launch readiness

Built and running: wallet, funding, VTU/bills, eSIM marketplace, USD and Naira
virtual accounts, virtual cards with configurable fee schedules, tiered global
KYC, promotions engine, referrals, agent programme, rewards, admin console, PWA.

Before go-live (partner-dependent): switch on live keys for each provider
(payments, card issuer, account provider, KYC) as their accounts are approved,
and complete each provider's sandbox validation. A few card fees (authorization,
funding, decline, international) are set up and shown to customers but only start
charging once the card issuer supplies the needed per-transaction data.

---

## 12. Glossary

- PWA: an installable web app that behaves like a native app.
- KYC: Know Your Customer — identity verification.
- Virtual account: a dedicated bank account number that credits the wallet.
- Virtual card: a digital card number for online spend.
- Ledger: the double-entry accounting record behind every balance.
- Idempotent: safe to retry; the same action never happens twice.
