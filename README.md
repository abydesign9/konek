# Konek — Starter Kit
Diaspora + local VTU/eSIM fintech PWA. This kit = validated ledger schema + Claude Code context + 12-week plan.

## What's here
- `CLAUDE.md` — project rules Claude Code loads automatically. The engineering constitution.
- `db/schema.sql` — Phase 1 (MVP) Postgres schema, **tested**: balanced-journal trigger proven to reject money-from-nothing.
- `db/schema_phase2.sql` — every module NOT in Phase 1 (dollar accounts, cards, voice, agents/B2B/white-label, full gamification, notifications, admin console). **Validated, but do not apply until its module's gate is met** — see `docs/PHASE2_ROADMAP.md`.
- `docs/BUILD_PLAN.md` — Phase 1 week-by-week code + vendor-paperwork tracks.
- `docs/PHASE2_ROADMAP.md` — maps every deferred module to its schema tables, vendor, and build gate, plus a suggested build order once Phase 1 is stable.
- `.env.example` — every key you'll need; fill as vendor approvals land.

## Start (Week 1, Session 1)
1. Install Claude Code: `npm install -g @anthropic-ai/claude-code`
2. `cd konek && claude`
3. First prompt: *"Read CLAUDE.md and docs/BUILD_PLAN.md. Task: Week 1 — scaffold Next.js 14 App Router + TypeScript + Tailwind as a PWA, connect Supabase using DATABASE_URL, apply db/schema.sql as the initial migration, and build phone+OTP auth with a mocked SMS sender behind an interface (Termii adapter later). Plan first, then implement, then run it."*

## Rules that keep you safe
Never edit ledger tables directly · never trust webhook payload amounts · integers only for money · one scoped task per session.

## Dev
```
npm install
npm run dev
```
