# Konek — Project Context for Claude Code

## What this is
A Nigerian diaspora + local fintech PWA: local VTU (airtime/data/cable/electricity/exam pins/betting), international top-up, eSIM, wallet (NGN+USD). Phase 1 = PWA only. NO P2P transfers, NO remittance, NO airtime-to-cash — ever. Receive-only virtual accounts come in Phase 2.

## Stack (do not deviate without asking)
- Next.js 14+ (App Router) + TypeScript + Tailwind — PWA with next-pwa
- Postgres (Supabase) — schema lives in db/schema.sql; NEVER modify ledger tables casually
- API routes in Next.js for v1; background jobs = simple worker (BullMQ + Redis later, cron for now)
- Payments: Paystack (cards + virtual NGN accounts). VTU: two aggregators behind an adapter interface (vendors/ dir) with health-check failover. eSIM: one wholesale API behind same adapter pattern.

## Non-negotiable engineering rules
1. **Money = double-entry ledger only.** Every value movement inserts a balanced journal (sum of entries = 0). NEVER update a balance column directly; balances are derived (SUM of entries) with a cached materialized balance updated in the same txn.
2. **All amounts are integers in minor units** (kobo, cents). No floats. Currency column always present.
3. **Every external call is idempotent.** Client sends idempotency_key; we store request hash; replays return the original result.
4. **Webhooks:** verify signature, insert raw event first, process async, never trust payload amounts — re-fetch from vendor API before crediting.
5. **State machines, not booleans.** Transactions: initiated → pending_vendor → delivered | failed → refunded. No other paths.
6. **Vendor adapter interface:** purchase(), verify(), balance(), health(). Aggregator choice is routing logic, never inline.
7. Velocity limits + new-account caps enforced in middleware (limits table), not hardcoded.
8. Log every state change to audit_log. No deletes on financial tables — reversal entries only.

## Style
- Mobile-first, icon-grid home (see docs/) — big tap targets, one-word labels, amount presets.
- Colors: indigo #1F3864, green #00C48C, gold #F5A623, bg #F7F8FA. Fonts: Sora (headings), Inter (body).

## How to work with me (usage discipline)
- One scoped task per session ("build the airtime purchase endpoint + tests"), then /clear.
- Default Sonnet; reserve Opus for ledger/architecture reasoning.
- Always run existing tests before claiming done. Schema changes require a migration file, never edits to old migrations.
