# Konek — 12-Week Build Plan (Claude Code on Pro)
Two parallel tracks. **Track B (paperwork) starts Week 1** — it's the real bottleneck.

## Track B — Vendor applications (file these while you code)
| Week | File / chase |
|---|---|
| 1 | Register business entity (CAC if NG). Apply: Paystack merchant, Reloadly account, 2nd VTU aggregator, Supabase + Vercel accounts (instant) |
| 2 | Apply: eSIM wholesale partner (eSIM Access / eSIM Go), Dojah or Smile ID sandbox, Termii/SMS provider for OTP |
| 3–4 | Chase approvals; sign VTU aggregator agreements; fund small test floats |
| 5 | Fintech/telecom lawyer session: ToS, privacy policy, MSB/MTL confirmation for target diaspora market |
| 8 | Paystack live keys + virtual account (Monnify/partner) activation |
| 10 | App Store/Play listings prep (if wrapping PWA later); WhatsApp Business API for support |

## Track A — Code (one scoped Claude Code task per session)
| Week | Build | Definition of done |
|---|---|---|
| 1 | Repo init: Next.js+TS+Tailwind PWA shell, Supabase connect, run db/schema.sql, auth (phone+OTP via Termii sandbox) | Sign up → OTP → session works |
| 2 | Ledger service: postJournal(), balance(), idempotency middleware, unit tests incl. unbalanced-rejection test | All ledger tests green |
| 3 | Wallet funding: Paystack checkout + webhook (signature verify → raw store → async credit), funding UI | Sandbox card → NGN balance credited exactly once (test replay!) |
| 4 | Vendor adapter interface + aggregator #1 (airtime+data sandbox), catalog sync job | Sandbox airtime purchase end-to-end |
| 5 | Transaction state machine + purchase flow UI (network chips, presets, beneficiaries, PIN, success screen) | 2-tap repeat purchase works |
| 6 | Aggregator #2 + health-check failover routing; electricity + cable + exam pins | Kill vendor 1 in test → vendor 2 fulfils |
| 7 | Intl top-up (Reloadly): country/carrier detect, USD pricing, checkout | Sandbox intl top-up delivered |
| 8 | eSIM: plan catalog, purchase, QR install screen, usage endpoint | Sandbox eSIM issued |
| 9 | Home screen final (icon grid, avatars, Buy Again, pinning), velocity limits middleware, risk flags | Limits enforced in tests |
| 10 | Rewards v1: coins on txn, referral codes, streak counter; admin console v1 (txn search, refund button, vendor health) | Refund creates reversal journal |
| 11 | Hardening: rate limiting, audit log coverage, reconciliation script (ledger vs vendor statements), error states UI | Recon script reports zero drift on test data |
| 12 | Closed beta with 20 real users from your own network, real ₦, small limits | 100 real transactions, zero ledger drift |

## Session discipline (protects your Pro limits)
- One row of this table ≈ 2–5 Claude Code sessions. Never "build the app" in one prompt.
- Start each session: "Read CLAUDE.md and docs/BUILD_PLAN.md. Today's task: <row>. Plan first, then implement, then run tests."
- /clear between tasks. Sonnet by default. Opus only for ledger/architecture questions.

## Launch gate (do not launch without)
Zero failed-then-not-refunded txns in beta · webhook replay test passed · recon zero-drift 7 days straight · velocity limits live · lawyer sign-off on ToS + market.
