# Konek — Engineering Overview (Co-founder Onboarding)

_Last updated: July 2026. Written so you can understand what has been built and why
without reading the code. Every claim here was checked against the codebase at the
time of writing; file paths are given so you can dig deeper when you want to._

---

## 1. What this is

A Nigerian diaspora + local fintech PWA: local VTU (airtime, data, cable,
electricity, exam pins, betting, gift cards), international top-up, eSIM, and an
NGN wallet, with a separate admin operations console. Phase 1 is PWA-only.
**Deliberately out of scope forever:** P2P transfers, remittance, airtime-to-cash.

**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind, Postgres (Supabase in
prod, embedded local Postgres for dev), API routes inside Next.js, Paystack for
card funding. Everything external sits behind an adapter interface (more on this
below).

---

## 2. The build history — M1 to M12

The app was built module by module. Each module landed as one or more commits with
tests and was verified live in the browser against a real local database before
being called done.

| Module | What it delivered |
|---|---|
| **M1 — Progressive KYC** | KYC tiers (0/1/2), BVN/NIN identity check + liveness step behind a vendor adapter (currently mock Dojah), tier gating on wallet funding and purchase limits. `src/lib/kyc/` |
| **M2 — Wallet history** | Transaction history screen, per-transaction receipts, CSV statement export. `src/app/wallet/` |
| **M3 — Betting + gift cards** | Betting top-up and gift-card products through the same VTU pipeline, type-aware receipt labels, brand/bookmaker icons. |
| **M4 — International top-up** | Carrier auto-detection from phone prefix, 100+ countries, family beneficiaries, share-receipt. Settlement is always in NGN; the display currency is cosmetic. `src/lib/intl/` |
| **M5–M8 (earlier phases)** | Core wallet + funding via Paystack, local VTU purchase pipeline, ledger, auth (phone + OTP, later email/password added), referrals, rewards/coins, agents, squads/gamification, virtual cards (mock Sudo), USD receive-only dollar account (mock Fincra), voice-minutes bundles (mock Twilio). |
| **M9 — Business hub** | Business accounts, team members, bulk airtime/data distributions, department budgets, business reports + CSV export. `src/lib/business/` |
| **M10 — Gamification surface** | Spin-the-wheel rewards, leaderboard. `src/lib/rewards/spin.ts` |
| **M11 — Notifications & support entry** | Per-channel notification preferences (push/SMS/WhatsApp/email), support chat entry. |
| **M12 — Admin operations console** | Rates configuration, admin RBAC (roles → permission types → permissions), referrals dashboard, Zendesk-style support (tickets, SLA, internal notes, knowledge base), Notification Center (templates, campaigns with audience segmentation, in-app CMS messages), admin settings (rotate admin secret, reset customer PIN). |
| **Post-M12** | Desktop-first admin shell (Stripe-dashboard-style sidebar + topnav, separate design language from the customer app), real-time ops alert bell, Discord ops alerts, provider monitoring dashboard, the cron worker, recurring top-ups and recurring bulk distributions, customer home redesign with bottom nav. |

Migrations `db/migrations/0001` → `0021` tell the same story in schema form. Rule:
**never edit an old migration; always add a new one.**

---

## 3. Money: the double-entry ledger

This is the most important invariant in the codebase. **No balance column is ever
written directly.** Every movement of value inserts a *journal* with two or more
*entries* that sum to zero.

- `src/lib/ledger/postJournal.ts` — the only way money moves. It:
  1. Asserts entries balance per currency in JS (`assertBalanced.ts`),
  2. Inserts the journal + entries **and** updates a cached
     `account_balances` row in the *same* DB transaction,
  3. Is backstopped by a Postgres **deferred constraint trigger** that re-checks
     the journal balances at COMMIT — so even a bug in application code cannot
     commit an unbalanced journal.
- Balances are derived (SUM of entries); the cached balance is a performance
  optimization kept in sync transactionally, never a source of truth on its own.
- **All amounts are integers in minor units** (kobo/cents). No floats anywhere.
  Every money column carries a currency.
- **Refunds are reversal journals** (`src/lib/ledger/refund.ts`): the original
  journal's entries are re-posted with negated amounts as a brand-new journal.
  Nothing financial is ever edited or deleted. Only `delivered` transactions can
  be refunded.
- **Reconciliation exists**: `scripts/reconcile.mjs` recomputes every account's
  balance from raw entries and compares against the cache, and re-verifies every
  journal balances per currency. Zero drift is the expected steady state; run it
  daily in production.

Account types you'll see in the ledger: user wallets (per user, per currency),
platform accounts (e.g. the Paystack gateway settlement account), and a **vendor
float account** — when a VTU purchase delivers, value moves from the user's wallet
to vendor float, which is how we track how much of our money is sitting with
providers (see §8).

---

## 4. Transaction lifecycle: state machines, not booleans

Every purchase/funding is a row in `transactions` with a strict state machine:

```
initiated → pending_vendor → delivered
                          ↘ failed
delivered → refunded   (admin action, reversal journal)
```

No other transitions exist. Every transition is also appended to
`transaction_events` (from-status, to-status, detail JSON), so the full history of
any transaction is reconstructable. On top of that, every significant action
(purchase delivered, wallet funded, refund, admin change, health check…) writes to
`audit_log`.

**How pending is handled:** a purchase is written as `initiated` *before* any
vendor is contacted, moves to `pending_vendor` once a vendor is selected, and only
moves to `delivered` after the vendor confirms — and **the ledger journal is only
posted at delivery**. If the vendor declines, the transaction goes to `failed` and
no money moved, so there's nothing to unwind. Daily spend limits deliberately count
`initiated` and `pending_vendor` amounts too, so in-flight transactions can't be
used to blow past caps. The full purchase flow is
`src/lib/purchases/purchaseVtuService.ts` — it's the best single file to read to
understand how everything (limits, ledger, vendors, rewards, notifications,
alerts) composes.

---

## 5. Idempotency

Every mutating/external call is wrapped in `withIdempotency(key, payload, fn)`
(`src/lib/idempotency.ts`):

- First call with a key **claims** it via `INSERT … ON CONFLICT DO NOTHING`
  (atomic — two concurrent requests can't both run), runs the work, stores the
  response.
- A replay with the same key **and same payload hash** returns the stored response
  without re-running anything.
- A replay with the same key but **different payload** is rejected
  (`IdempotencyConflictError`) — a client can't reuse a key for a different
  purchase.
- A replay while the first call is still running gets
  `IdempotencyInProgressError` instead of double-executing.
- If the work **throws**, the claim is released so the client can retry the same
  key after fixing the problem (e.g. top up, then retry).

Clients generate a UUID per attempt; the purchase key is namespaced per user
(`purchase:<userId>:<key>`). Webhook crediting uses its own key
(`credit_wallet:<reference>`) so a replayed webhook can never double-credit.

---

## 6. Webhook validation (Paystack + Fincra pattern)

Both webhook handlers (`src/app/api/webhooks/paystack/route.ts` and
`src/app/api/webhooks/dollar-account/route.ts`) follow the same hard rules:

1. **Verify the HMAC-SHA512 signature** over the *raw* body, using
   `crypto.timingSafeEqual` (constant-time compare, no timing side channel).
   Invalid signature → stored, marked, rejected with 401.
2. **Insert the raw event first** into `webhook_events` (with
   `signature_valid` recorded) *before* any processing — we never lose a webhook,
   even a malformed or malicious one.
3. **Never trust the payload's amount.** The handler only takes the *reference*
   from the payload, then re-fetches the authoritative amount/status from the
   provider's verify API (`src/lib/wallet/creditFromPayment.ts` calls
   `paymentGateway.verifyTransaction`). What Paystack's webhook *claims* was paid
   is irrelevant; what Paystack's verify endpoint *confirms* is what gets
   credited.
4. **Crediting is idempotent** (see §5) and replay-safe — an already-`delivered`
   transaction is a no-op.
5. Processing errors are recorded on the event row but still return 200, so the
   provider doesn't hammer retries for a bug we need to fix server-side.

---

## 7. Fraud, limits, and gates

- **Velocity limits live in the `limits` table**, keyed by KYC tier + metric +
  currency — raising a cap is a data change, not a deploy.
  `src/lib/limits/checkLimits.ts` enforces, per purchase:
  - `single_txn` — max single purchase for the tier,
  - `daily_spend` — rolling daily total (counting in-flight transactions),
  - `new_account_daily` — a *tighter* daily cap that automatically applies for
    the first 72 hours of an account's life.
- **Every limit breach becomes a fraud work item**, not just an error: a
  `risk_flags` row is inserted, and a `fraud_queue` item is created with priority
  scaled by how far over the limit the attempt was (>3× = critical,
  >1.5× = high). High/critical flags also fire an external ops alert (§10).
- **KYC tier gates**: tier 0 cannot fund the wallet (the home screen routes them
  to verification); limits scale with tier. KYC itself is a two-step flow
  (identity + liveness) through the vendor adapter.
- **Transaction PIN**: separate from login. 4–6 digits, bcrypt-hashed
  (`pin_hash`), required to authorize every purchase. Admin can reset it
  (audited).
- **Admin RBAC**: `admin_roles` → `admin_permission_types` → `admin_permissions`;
  every admin API route calls `assertPermission(role, key)` and returns 403 on
  failure. Admin sessions are HMAC-signed cookies; login requires the shared
  admin secret **and** an allowlisted email (`ADMIN_ALLOWLIST_EMAILS`). The
  secret can be rotated from the admin Settings screen (stored in
  `platform_config`).
- **No deletes on financial tables.** Corrections are reversal entries;
  everything else is a status change plus an audit row.

---

## 8. Vendors: adapters, failover, and float

Every external provider category is behind the same four-method adapter interface:
`purchase()`, `verify()`, `balance()`, `health()` (`src/vendors/types.ts`).
Business logic never knows which vendor it's talking to.

**Routing & failover** (`src/vendors/registry.ts`):

- The `vendors` table holds each vendor's `kind`, `priority`, and `healthy` flag.
- `selectVendor(serviceType)` picks the highest-priority **healthy** vendor at
  purchase time. Flipping `healthy` (by ops toggle or a failed health check)
  reroutes all future purchases instantly — no deploy.
- `refreshVendorHealth()` runs on the cron tick (§9): it calls each adapter's
  `health()`, records latency, updates the flag, logs to `audit_log`, and fires a
  `provider_outage` ops alert on a healthy→unhealthy transition.
- **Honest caveat:** this is health-check-based failover, not a full circuit
  breaker. There is no automatic trip on elevated *error rates* mid-window, and
  no half-open probing — the health check interval is the recovery mechanism. If
  real vendors prove flaky between checks, adding error-rate tripping inside
  `selectVendor` is a natural next step.

**Provider monitoring** (`src/lib/vendors/vendorMonitoring.ts` + admin dashboard):
real 24h success rates computed from actual transaction outcomes
(delivered vs failed), health-check latency, and health history. Vendors with no
traffic report `null`, not 0%, so the UI shows "no data" instead of implying an
outage.

**Provider wallet balances / float:** each adapter exposes `balance()` (our
prepaid balance at that provider), and the ledger's **vendor float account**
accumulates the value of everything delivered — i.e., what we've consumed from
providers. Internal ledger reconciliation exists (`scripts/reconcile.mjs`, §3).
**What is *not* built yet:** the *provider-side* comparison — checking the
adapter-reported prepaid balance against our ledger float, low-float alerts, and
auto top-up/rebalancing between provider wallets. Today that's a manual ops task;
it should become a cron-tick job comparing `adapter.balance()` against expected
float and alerting on drift, once real vendors are wired.

---

## 9. The worker: one cron tick

There is no long-running background worker (deliberately — Phase 1 keeps
infrastructure minimal). Instead, `POST/GET /api/cron/tick`
(`src/app/api/cron/tick/route.ts`) is the single scheduled entry point, guarded by
`CRON_SECRET` (Vercel Cron sends `Authorization: Bearer`; manual/dev calls send
`x-cron-secret`). Each tick runs, in order:

1. `refreshVendorHealth()` — vendor health checks + outage alerts,
2. `dispatchDueCampaigns()` — scheduled notification campaigns,
3. `dispatchDueRecurringTopups()` — recurring international top-ups,
4. `dispatchDueRecurringDistributions()` — recurring business bulk distributions.

Locally, `scripts/cron_dev.mjs` polls it. In prod it's a Vercel Cron entry in
`vercel.json`. If we outgrow this (long-running jobs, retries with backoff), the
plan is BullMQ + Redis — the tick functions are already written as callable units
so they can move onto a queue without rewriting.

---

## 10. Ops alerting

`sendExternalAlert(event, message, meta)` (`src/lib/alerts/externalAlert.ts`) is
the single hook for operational events: new/assigned support tickets, SLA
breaches, failed transactions, high fraud scores, provider outages, large
transactions, pending KYC, chargebacks. It always logs; if `DISCORD_WEBHOOK_URL`
is set it also posts a severity-colored Discord embed. Callers never change when
credentials arrive — set the env var and delivery goes live. Alert delivery
failures are swallowed (logged) so alerting can never break the underlying
operation.

The admin console's notification bell is backed by `/api/admin/ops-alerts` —
real counts of open tickets, unhealthy providers, pending business KYB, and open
fraud-queue items, polled every 30s.

---

## 11. Mock inventory — what's real vs. what's simulated

Everything below implements the exact same interface a real provider will, so
swapping in the real thing is a config/adapter change, not a rewrite. **Nothing
else in the pipeline changes** — ledger, idempotency, state machine, limits all
already run for real against these mocks.

| Area | Adapter file | Status | How the real one gets wired |
|---|---|---|---|
| **VTU (airtime/data/cable/electricity/exam/betting/gift-card/intl/eSIM)** | `src/vendors/mockVtu.ts` (two sandbox vendors, so priority + health failover is exercised for real; simulates random vendor declines) | **Mock** | Implement a real aggregator adapter (e.g. Reloadly/VTpass) with the same 4 methods, register it in `src/vendors/registry.ts`, seed a `vendors` row. |
| **Card funding (Paystack)** | `src/lib/payments/paystack.ts` — **real, complete implementation** (initialize + verify + signed webhook). `src/lib/payments/index.ts` auto-selects it when `PAYSTACK_SECRET_KEY` is a real key; otherwise falls back to `src/lib/payments/mock.ts`. | **Real code, env-gated** | Set a live `PAYSTACK_SECRET_KEY`. |
| **KYC (BVN/NIN + liveness)** | `src/vendors/kyc/mockDojah.ts` | **Mock** | Real Dojah (or Smile ID) adapter behind `src/vendors/kyc/types.ts`; swap the import in `src/lib/kyc/kycService.ts`. |
| **USD dollar account (receive-only)** | `src/vendors/dollarAccount/mockFincra.ts` | **Mock** | Real Fincra adapter; the webhook handler + `FINCRA_WEBHOOK_SECRET` signature verification is already written. |
| **Virtual cards** | `src/vendors/cards/mockSudo.ts` | **Mock** | Real Sudo adapter behind `src/vendors/cards/types.ts`. |
| **Voice minutes** | `src/vendors/voice/mockTwilio.ts` | **Mock** | Real Twilio adapter. |
| **SMS/OTP delivery** | `src/lib/sms/mock.ts` (always selected; comment marks where Termii branches in) | **Mock** | Implement `TermiiSmsSender` against `src/lib/sms/types.ts` when `TERMII_API_KEY` lands. |
| **Demo OTP shortcut** | Phones listed in `DEMO_OTP_PHONES` get the OTP echoed in the API response | **Dev-only convenience** | Remove/empty the env var in prod. |
| **Discord ops alerts** | `src/lib/alerts/externalAlert.ts` | **Real code, env-gated** | Set `DISCORD_WEBHOOK_URL`. |
| **FX rate (intl top-up display)** | Configured value in `platform_config`, editable from admin Rates | **Manual config** | Optionally replace with a rate-feed fetch on the cron tick. |

Seed/demo data: `scripts/seed_demo.mjs` populates demo users, transactions, and
catalog plans for local development. The catalog plans (data bundles, cable
packages) are seeded records, not live vendor catalogs — a real aggregator's
catalog-sync will replace them (there's already an `/api/admin/catalog-sync`
convention for this).

---

## 12. Where to start

**Local dev, in order:**

```bash
npm install
node scripts/pg_dev.mjs        # boots embedded Postgres on 127.0.0.1:5599
npm run db:migrate             # applies db/migrations in order
node scripts/seed_demo.mjs     # demo users + catalog
node scripts/provision_admin.mjs   # admin secret + allowlisted email
npm run dev
```

Run `npx tsc --noEmit` and `npx vitest run` (150+ tests) before any commit — this
has been the discipline throughout and it's why the ledger/idempotency/limits
logic is trustworthy.

**Highest-leverage next work, roughly in order:**

1. **Wire one real VTU aggregator** — the whole purchase pipeline is waiting on
   it; it's one adapter file + a vendors row.
2. **Go live on Paystack** — code is done; needs the live key, webhook URL
   registration, and a test card run.
3. **Real KYC vendor** — same adapter swap.
4. **Provider float reconciliation** (§8 caveat) — cron-tick job comparing
   `adapter.balance()` vs ledger float, with low-float alerts (internal
   ledger reconciliation already exists in `scripts/reconcile.mjs`).
5. **Error-rate circuit breaking** in `selectVendor` if real vendors prove flaky.
6. Real SMS (Termii), then trim `DEMO_OTP_PHONES`.

**Non-negotiables to preserve** (also in `CLAUDE.md` at the repo root, which the
AI tooling reads on every session): ledger-only money movement, integer minor
units, idempotency on every external call, signature-verified + re-fetched
webhooks, state machines not booleans, adapters not inline vendor calls, limits in
the DB not in code, audit everything, never delete financial rows, new migration
files only.
