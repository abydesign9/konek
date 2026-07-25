# Konek

A Nigerian diaspora and local fintech PWA: local VTU (airtime, data, cable,
electricity, exam pins, betting), international top up, eSIM, and a NGN + USD
wallet with withdraw to your own bank.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind, PWA via next-pwa
- Postgres (Supabase), schema built from ordered migrations in `db/migrations`
- Payments via Paystack; VTU and eSIM through a vendor adapter layer

## Getting started

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the values, then apply migrations:

```bash
npm run db:migrate
```

## Checks

```bash
npx tsc --noEmit
npx next lint
npx vitest run
```

## Documentation

See [`docs/HANDOVER.md`](docs/HANDOVER.md) for the full overview: architecture,
every module, environment variables, admin onboarding, and the operations
runbook.
