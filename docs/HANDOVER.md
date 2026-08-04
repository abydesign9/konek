# Konek Handover (M1 to M12 and beyond)

This document hands over everything built so the team can start using Konek. It
covers what the app is, how to run it, how money and verification work, every
module (M1 to M12) plus the newer additions, and a day to day operations
runbook for the admin console.

Last updated: 2026-08-03. Database is on migration 0055.

---

## 1. What Konek is

A Nigerian diaspora and local fintech PWA (installable web app). Phase 1 covers:

- Local VTU: airtime, data, cable TV, electricity, exam pins, betting.
- International top up and mobile data top up.
- eSIM (travel data), including a multi supplier marketplace.
- Wallet in NGN and USD.
- Withdraw to your OWN bank account.
- Rewards, referrals, agents, and a full admin console.

Deliberately NOT built (product rules): no peer to peer transfers, no
remittance to third parties, no airtime to cash. Withdrawals go only to the
user's own bank.

---

## 2. Stack and repo layout

- Next.js 14 (App Router) + TypeScript + Tailwind, PWA via next-pwa.
- Postgres (Supabase). Schema is built from ordered migrations in `db/migrations`.
- Payments: Paystack (cards + funding). VTU and eSIM via a vendor adapter layer.
- Layout convention: every customer-app screen (Home, Wallet, Connect, Cards,
  Profile, Settings, KYC, Buy flows — dozens of pages) wraps its content in
  `<div className="mx-auto max-w-lg">` (512px), even on desktop web. This is
  deliberate — a consistent, mobile-first single-column app, not a responsive
  dashboard — distinct from the business hub (`/business`), which is its own
  Stripe-Dashboard-style visual language with a real sidebar and wider content
  columns. If you add a new customer-app page, include that wrapper; a page
  missing it will stretch edge-to-edge and look broken on anything wider than
  a phone (this happened to Home, Wallet and Connect and had to be fixed).
  The bottom nav (`src/components/BottomNav.tsx`, rendered once from the root
  layout via `BottomNavGate.tsx`) is full-bleed (`w-full`) at every size
  regardless of this convention, since it's chrome, not content.

Key folders:

- `src/app` pages and API routes (`src/app/api/...`).
- `src/app/admin` the admin console (see section 9).
- `src/lib` business logic (ledger, kyc, marketplace, auth, admin, ...).
- `src/vendors` pluggable provider adapters (vtu, esim, kyc, payments).
- `db/migrations` ordered SQL migrations (never edit an applied one, add a new file).
- `docs` this handover plus engineering overview, provider integration, roadmap.

---

## 3. Environment variables

Set these in Vercel (Project Settings > Environment Variables) for production and
in `.env.local` for local development. Both files are gitignored. Never hardcode
secrets in code.

Required:

- `DATABASE_URL` Supabase pooler connection string, port 6543, with
  `?uselibpqcompat=true&sslmode=require`.
- `SESSION_SECRET` signs customer sessions.
- `PII_MASTER_KEY` base64 32 byte key for AES-256-GCM PII encryption.
- `ADMIN_SECRET` used only to sign the admin session cookie (not a login password).
- `ADMIN_ALLOWLIST_EMAILS` comma list; the first admin can bootstrap from one of these.
- `CRON_SECRET` guards the cron tick endpoint.

Provider keys (set when going live, otherwise mock adapters are used):

- Paystack keys, eSIM Access (`ESIM_ACCESS_ACCESS_CODE`, `ESIM_ACCESS_SECRET_KEY`),
  and any KYC provider keys plus `KYC_WEBHOOK_SECRET`.

Rotate any secret that has ever been shared in chat or email.

---

## 4. Running, migrating, deploying

Local dev:

```bash
npm install
npm run dev
```

Run database migrations (applies any new files, tracked in `schema_migrations`):

```bash
npm run db:migrate
```

Checks before pushing (all must pass; run the full lint, not just changed files,
because production build treats lint warnings as errors):

```bash
npx tsc --noEmit
npx next lint
npx vitest run
```

Deploy: push to `main`. Vercel builds and deploys. Migrations are run manually
with `npm run db:migrate`; they are not part of the build.

---

## 5. Core architecture (the non negotiables)

- Double entry ledger. Every value movement posts a balanced journal (entries
  sum to zero). Balances are derived (sum of entries) with a cached materialized
  balance updated in the same transaction. Never update a balance column directly.
  See `src/lib/ledger`.
- Money is always integer minor units (kobo, cents). No floats. Currency always present.
- Reserve, settle, release. Spending holds funds (reserve), then settles on
  delivery or releases on failure. A DB guard forbids a negative wallet.
  See `src/lib/ledger/reservations.ts`.
- Idempotency. External calls carry an idempotency key; replays return the
  original result. See `src/lib/idempotency.ts`.
- Webhooks. Verify signature, store the raw event first, process asynchronously,
  and never trust payload amounts (re-fetch from the provider before crediting).
  See `src/lib/webhooks`.
- State machines. Transactions move initiated to pending_vendor to delivered,
  failed, or refunded. No other paths.
- Vendor adapters. Every provider implements a common interface; choosing a
  provider is routing logic, never inlined. See `src/vendors`.
- KYC tiers. 0 browse, 1 transact, 2 finance, 9 business. Gating happens at the
  route or middleware layer.
- Audit log. Every state change is written to the audit log. No deletes on
  financial tables, only reversal entries.

---

## 6. Modules M1 to M12

Each module note below says what it does, the key files, and how to use it.

### M1 Security foundation
Durable rate limiting, PIN lockout after repeated failures, transactional signup,
and KYC input validation. PII is encrypted at rest with AES-256-GCM envelope
encryption (`src/lib/crypto/pii.ts`); row level security is defence in depth only.
Auth model: email + password is primary, phone is verified once for recovery.

### M2 Reservation ledger
The spend path is reserve, settle, release, backed by a database non negative
wallet guard. Refunds are net and idempotent (reversal entries, never deletes).
Signed off against live Supabase. Files: `src/lib/ledger/reservations.ts`,
`postJournal.ts`, `refund.ts`.

### M3 Local VTU
Airtime, data, cable, electricity, exam pins, betting. Async pending handling is
correct (a purchase can be pending on the vendor and settle later). Real
aggregator wiring is pending your choice of vendor and their API docs, but the
adapter contract is ready. Files: `src/lib/purchases`, `src/vendors/vtu`.

### M4 Vendor adapter framework
A vendor agnostic contract: purchase, verify, balance, health, listPlans, plus
signing, webhook verification, error normalization, capabilities, and catalogue
normalization. New providers drop in without touching business logic.
Files: `src/vendors` and `src/lib/vendors` (routing, health, circuit breaker).

### M5 eSIM
A vendor agnostic eSIM provider abstraction plus an esims lifecycle table
(activation and usage through the abstraction). Real provider is eSIM Access
(`src/vendors/esim/esimAccess.ts`), enabled when its env keys are set.

### M6 USD accounts
Receive only USD accounts. Inflow crediting is atomic and idempotent, with a
generic inflow webhook and an atomic NGN/USD convert. Files:
`src/lib/dollarAccount`.

### M7 Cards
Virtual cards for online spend. Fixed settlement authorization, correct revenue
accounting, atomic settlement, and dispute de duplication. Files: `src/lib/cards`.

### M8 Voice
The live wallet debiting call path was removed (it was mock backed and not
idempotent). A dormant minutes perk scaffold remains for future use.

### M9 Workforce (agents and B2B)
Agents earn commission; businesses do bulk distribution. Fixed agent double
payout, mixed currency issues, distribution overlap double charge, and commission
de duplication. Files: `src/lib/agents`, `src/lib/business`, `src/lib/bulk`.

### M10 Rewards
Coins, streaks, daily spin. Fixed a daily spin double payout with per day
idempotency and atomic wallet credit. Files: `src/lib/rewards`, `src/lib/gamification`.

### M11 Notifications and support
Notification campaigns with a sending lock so a campaign cannot double blast.
Support tickets are IDOR safe. The admin support console can reply, resolve, and
close. Files: `src/lib/notifications`, `src/lib/support`.

### M12 Ops console
Role based admin access control (RBAC): roles map to permissions, and every
write route asserts a permission. Six admin write routes that were missing
permission gates were fixed. Files: `src/lib/admin`, `src/app/admin`.

---

## 7. Newer modules (after M12)

### Multi supplier eSIM marketplace
Unlimited eSIM suppliers collapse into ONE customer listing per plan via
fingerprint matching. Pure, tested engines: matching, tiered pricing, best
supplier selection, and failover. Admin console at `/admin/marketplace`
(dashboard, catalog with every supplier cost, price overrides, tiered pricing
rules, CSV import, API sync, delete and bulk actions). Customer store at
`/marketplace`. Suppliers are never shown to customers. Migration 0040.

### Global configurable KYC
Konek is a global app, so BVN and NIN are Nigeria only methods, never hardcoded.
A country and method requirement matrix decides, per country and tier, which
verification methods a customer must complete. Providers are pluggable and routed
by (country, method). Adding a country or provider is data, no code change. Admin
console at `/admin/kyc-config`. Customer page at `/kyc` shows only the methods the
user's country requires. Migration 0041.

### Admin operations tools
- Customers (`/admin/customers`): search everyone, see balances and verification,
  suspend, reactivate, or close accounts. No hard delete; a closed account keeps
  its ledger history but loses access.
- Funding reconciliation (`/admin/funding`): when a payment company times out but
  the customer was charged, verify the reference with Paystack and credit the
  wallet once (the same trusted, idempotent path the webhook uses).
- Block suspected fraud: from the transactions view, flag a transaction and fail
  it if still open so no value moves.
- Rates (`/admin/rates`): edit catalogue prices inline, bulk re price at cost plus
  a percentage, import a price sheet, delete single or in bulk, and plans are
  grouped by operator (MTN, Airtel under Data; DStv, GOtv under Cable).
Migration 0042 adds the `customers.manage` and `funding.approve` permissions.

### Business hub (full buildout)
M9's "businesses do bulk distribution" grew into a full self-serve hub at
`/business` (`src/components/BusinessShell.tsx` — its own fixed sidebar on
desktop, drawer + header with a back arrow on mobile, deliberately distinct
from the customer app's bottom-nav chrome). A business gets its own wallet,
completely separate from the owner's personal wallet (`owner_type='business'`
ledger accounts):

- **Accounts & cards**: dedicated NGN/USD virtual accounts to receive money
  (`business_virtual_accounts`), and virtual cards issued against the
  business wallet (`business_cards`) — both reuse the exact same mock
  adapters the personal wallet/cards use; swapping in a real provider is a
  vendor-adapter change, not a rebuild.
- **Vendor transfers**: save a vendor's bank details, pay them out of the
  business wallet via a self-contained reserve/settle/release flow
  (`business_vendors`, `business_vendor_transfers`), mirroring
  `withdrawService.ts`'s pattern rather than reusing the personal
  `reservations` table (that one's keyed to a single `user_id`).
- **Campaigns** (migration 0054): budget-tracked groupings for distributions
  (`business_campaigns`) — link a distribution to a campaign and see spend
  roll up against budget.
- **Public API** (migration 0054): SHA-256-hashed sandbox/live API keys
  (`business_api_keys`, plaintext shown once at creation) authenticate
  `POST /api/v1/business/distributions` — sandbox validates only, live
  processes exactly like the Distributions page. Every call is rate-limited
  and logged to `business_api_requests`, visible on `/business/api`.
- **Settings finalized**: per-member role changes, notification preferences
  (failed distributions / low balance threshold — `business_alerts.ts`),
  emoji branding (reuses the same `AVATAR_PRESETS` emoji-avatar system the
  rest of the app uses; there's no real file-upload infra anywhere in this
  codebase, so "logo" was scoped honestly to that), a real audit-log page at
  `/business/security` (`audit_log.detail->>'businessId'` scoped), and
  `/business/billing` reframed as a fee statement — Konek has no
  subscription model, so this shows real per-action fees instead of a fake
  billing UI.
- Migrations 0052 (virtual accounts/cards/vendors/wallet), 0053 (widen the
  `journals_type_chk` constraint to allow `'transfer'`), 0054 (campaigns,
  API keys), 0055 (settings notification/branding columns).

Two real bugs were caught and fixed while building this (both are the kind
of thing worth re-checking if you touch this area): `audit_log.actor` was
being passed a **business** id instead of the acting user's id (or the
`'system'` sentinel for unattended webhook credits) in a few places —
`actor` must always be a user, admin, or `'system'`, never a business,
or the audit trail can't show who did what. And several business
`logAudit()` calls were missing `businessId` in their `detail` payload,
which silently made them invisible to the business-scoped audit-log query.

---

## 8. Admin login and onboarding admins

Admins sign in with their own Konek account (the same email and password as their
customer account). Being an admin is a separate grant.

To onboard a new admin:

1. The person signs up on Konek normally with the email that should be an admin.
2. A super admin opens Users and Roles in the admin console and adds that email
   with a role.
3. They log in at `/admin` with the same email and password they use for Konek.

Notes:

- To change an admin login password, change the Konek account password in the app.
  There is no separate admin password.
- The very first admin can bootstrap: put the email in `ADMIN_ALLOWLIST_EMAILS`,
  sign up on Konek with that email, then log in at `/admin` once to create the
  super admin grant automatically.
- `ADMIN_SECRET` is only the key that signs the admin session cookie. It is not a
  login credential.

Current setup: `toptonmedia@gmail.com` is super admin, `topeventures@gmail.com` is
support. They must have a Konek account (sign up) to log in, since the test users
were cleared.

---

## 9. Admin console guide

Navigation lives in the left sidebar (`src/components/AdminShell.tsx`). Pages:

- Executive dashboard and Console: metrics, transactions search, refunds, reconciliation.
- Rates: catalogue pricing, markup, import, delete, grouped by operator.
- Customers: view, suspend, block, close.
- Funding: verify and credit timed out top ups.
- KYC review: approve or reject document submissions.
- KYC config: the country and method requirement matrix, and providers.
- Users and Roles: invite or approve admins, set roles and permissions.
- Agents, Referrals, Support, Providers, Marketplace, Notifications, Onboarding,
  Settings.

Every admin write action checks a permission tied to the admin's role, and is
written to the audit log with the admin's identity.

---

## 10. Operations runbook

- Customer charged but wallet not credited: Funding page, find the reference,
  Verify and credit. Safe to retry; it only credits if Paystack confirms success.
- Suspected fraud: Console transactions, Block. If the transaction is still open
  it is failed immediately; if already delivered, raise a refund instead.
- Lost or compromised customer PIN: Settings, Reset a customer's PIN.
- Onboard a supplier price list: Rates or Marketplace, Import a CSV, or API sync.
- Add a country to KYC: KYC config, add a requirement row (country, tier, methods).
- Suspend or close a customer: Customers page.

---

## 11. Security notes and boundaries

- Never hardcode secrets. Use environment variables (Vercel and `.env.local`).
- All PII is encrypted; the ledger is the source of truth for money.
- Product boundaries stay enforced: no P2P transfers, no remittance to others, no
  airtime to cash. Gift cards are buy only.
- The browser only ever calls our own backend. Every third party call (Paystack,
  eSIM, KYC) happens server side in an API route; no secret or vendor key is in
  the client bundle. This is enforced structurally by a Content Security Policy
  with `connect-src 'self'` (see `next.config.mjs`), alongside HSTS,
  X-Frame-Options DENY, nosniff, a locked down Permissions-Policy, and
  httpOnly + secure + sameSite session cookies.
- Launch checklist: the dev only mock payment endpoint
  (`/api/payments/mock/complete`) auto-disables as soon as a real
  `PAYSTACK_SECRET_KEY` is set. Set the live key before going live.
- Logging policy: never log secrets, API keys, passwords, PINs, OTPs, BVN/NIN,
  full card numbers, or raw amounts tied to a person. Log identifiers and status
  instead. Mock OTP senders only print codes outside production.
- Vendor spend routes are rate limited per user (or per partner key), spend calls
  are idempotent (a unique reference per transaction, replays rejected), and API
  errors return generic messages while typed, user safe errors carry a specific
  message. Set daily spend caps and low balance alerts in each vendor dashboard.
- Two CSP tiers, chosen per route in `src/middleware.ts`: public marketing pages
  (landing, /about, /pricing, /faq, /terms, /privacy, /help, /company, etc. — see
  `MARKETING_PATHS`) get a relaxed, cache-friendly CSP (`unsafe-inline` on
  script-src only) so they can be statically generated; everything else,
  including login/signup, gets a strict nonce CSP (`'nonce-…' 'strict-dynamic'`,
  no unsafe-inline). **Never link to a bare public route from inside the
  authenticated app** — it drops a signed-in user onto the weaker CSP tier and
  out of the app shell entirely. If a page like Privacy/Terms/FAQ needs to be
  reachable from inside the app, build a session-gated route under the app
  subtree that reuses the same content component (see `/settings/privacy`,
  `/settings/terms`, `/support/faq` — content lives in
  `PrivacyPolicyContent.tsx` / `TermsOfServiceContent.tsx` / `FaqList.tsx` and
  is shared with the public page so the two can't drift). New routes get the
  strict CSP automatically just by not being in `MARKETING_PATHS` — no
  middleware change needed.
- **Incident (2026-08-02, fixed 2026-08-03):** an obfuscated payload was found
  appended to `postcss.config.mjs` on `main` — it queried public Ethereum RPC
  endpoints, decoded an IP address out of a transaction's `to` field, and
  spawned a detached `node -e` process to fetch and execute further code from
  that address on every build. It rode in on a legitimate-looking commit whose
  diff should only have touched the business-KYB apply form (i.e. it was
  injected onto disk by something already running on the dev machine, then
  swept into a `git add -A` commit — not a new dependency; `package.json` was
  untouched). It had been executing on every Vercel production build and every
  local build since merge. Removed in commit `a905830` (reverted the file to
  its clean original). If you ever see `postcss.config.mjs`,
  `next.config.mjs`, `tailwind.config.ts` or similar config files grow
  unexpectedly in size or gain content after their `export default`, treat it
  as a live incident: diff the file against git history immediately, and
  rotate `DATABASE_URL`, `ADMIN_SECRET`, and any provider keys in Vercel env
  vars, since the payload had full `process.env` access during builds. Avoid
  broad `git add -A` — stage files by name so an unexpected diff like this
  gets seen before it's committed, not after.

---

## 12. Known pending items

- Real local VTU aggregator wiring (waiting on vendor choice and API docs).
- Second eSIM supplier (eSIM Access is wired; add more as marketplace suppliers).
- Brand logo asset at `public/brand/konek-logo.png`.
- Optional service worker caching pass for faster loads and no stale content.
- Optional: a self service "request admin access" flow (today a super admin
  approves by adding the email under Users and Roles).

---

## 13. PWA (installable app)

Konek installs to the Home Screen and runs full screen, no app store needed.

- Install experience: launched as an installed app (standalone), it opens at
  `/home` (which redirects to `/login` when signed out), so it shows a splash
  then login/signup and never the marketing landing page. In a normal browser
  tab the landing page still shows. A brief branded splash plays once per launch
  on both Android and iOS.
- Push notifications: real Web Push is wired (VAPID keys, a custom service
  worker, `push_subscriptions` table, subscribe/unsubscribe routes, delivery
  through the notification path). Customers turn it on under Preferences. To
  enable it set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and
  `VAPID_SUBJECT` (generate with `npx web-push generate-vapid-keys`); without
  them push simply no-ops. iOS caveat: push works only from the installed app on
  iOS 16.4 or newer, which the toggle explains to the user.
- Biometric: today's biometric is an on-device app unlock (Face ID / Touch ID /
  fingerprint gates re-entry on that device). A full server-verified passwordless
  biometric LOGIN (a WebAuthn assertion verified on the server) is a separate,
  security-sensitive piece still to build; do not treat the current feature as a
  standalone login factor.
- App store version later: wrap this same app with Capacitor and keep one backend.

---

## 14. Financial layer (built for the September launch)

All of the following is live and admin-editable. Provider integrations run on
mocks until their sandbox keys are set, then flip to live with no code change.

- Promotions engine (migration 0045): configurable promos (signup, first
  deposit, VA activation, card cashback, milestone) that credit a locked bonus
  wallet which unlocks to the main wallet once the deposit + spend conditions are
  met. Admin: `/admin/promotions`. Triggers are wired across signup, funding,
  VTU/eSIM spend, card spend and virtual-account inflows.
- NGN virtual accounts via Monnify (adapter + mock, no migration; reuses
  `virtual_accounts`): a reserved account number that credits the NGN wallet.
  Webhook `/api/webhooks/monnify`. Customer page `/wallet/naira-account`.
  Production Monnify needs the user's BVN captured at provisioning.
- Financial config (`/admin/financial-config`): transaction limits (read live by
  the spend checks), fees, account KYC tiers, provider status, live stats. Keys
  are never stored in the DB.
- Card products + fee schedule (migration 0046): `card_products` catalogue with
  a full fee schedule (creation, authorization, funding, decline, dispute,
  international), currency, and virtual/physical form factor. Admin:
  `/admin/card-products`. The customer card flow is `/cards` (your cards only,
  tap for detail), `/cards/new` (Global/Domestic catalogue) and
  `/cards/new/[id]` (fee schedule + Get). Creation and dispute fees are charged
  live; the rest are displayed and admin-editable but not yet charged (need the
  acquirer's per-transaction data). A foreign-currency card needs no separate
  receiving account: it spends from the wallet in that currency, topped up by
  converting from the Naira wallet.
- SmileID KYC + fraud auto-freeze (migration 0047): SmileID plugs into the global
  KYC framework, disabled until enabled in `/admin/kyc-config` with keys set. A
  fraud/mismatch verdict (sync or via `/api/webhooks/kyc`) freezes the account
  (suspend + revoke sessions), raises a risk flag + fraud-queue item, and alerts
  admin. Reversible from `/admin/customers`.
- Agent programme (`/admin/agent-program`): affiliates, campus ambassadors and
  marketing partners refer customers and earn an admin-set commission on those
  customers' purchases across the catalogue (VTU, cards, eSIM), plus perks
  (card-fee waiver/discount, a limits multiplier, priority). The whole programme
  has a master on/off switch; every value is editable, nothing hardcoded.
  Individual agents (approve, per-agent rate, pay commissions) stay under
  `/admin/agents`.
- International KYC: requirements are per country. Non-Nigerian customers verify
  with their own government ID (passport / national ID), never BVN/NIN, so
  diaspora and international users are not blocked by Nigerian rules. Set the
  user's country of residence at signup so the right matrix applies.
