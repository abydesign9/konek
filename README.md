# Konek — Starter Kit
Diaspora + local VTU/eSIM fintech PWA. This kit = validated ledger schema + Claude Code context + 12-week plan.

## What's here
- `CLAUDE.md` — project rules Claude Code loads automatically. The engineering constitution.
- `db/schema.sql` — Postgres schema, **tested**: balanced-journal trigger proven to reject money-from-nothing.
- `docs/BUILD_PLAN.md` — week-by-week code + vendor-paperwork tracks.
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
