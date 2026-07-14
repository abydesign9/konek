# Konek — Phase 2+ Roadmap
### Everything from the product spec NOT in Phase 1, mapped and schema'd so nothing is lost.

Phase 1 (`db/schema.sql`) covers: users/KYC tiers, the double-entry ledger, transactions (already
includes local VTU types: airtime/data/cable/electricity/exam_pin/betting + intl_topup + esim +
fx_convert), beneficiaries, catalog, vendor adapters + webhooks, velocity limits, risk flags, basic
reward_events, and audit log. That's the whole MVP.

Everything below is **explicitly deferred, not forgotten.** Schema lives in
`db/schema_phase2.sql` (validated — applies cleanly on top of schema.sql, 48 tables total).
**Do not apply schema_phase2.sql or build against it until its gate is met.** Building ahead of
the gate is exactly the "over-build before real users" failure mode flagged earlier.

---

## M6 — Virtual Dollar Account (receive-only)
**Tables:** `virtual_accounts`, `virtual_account_inflows`
**Vendor:** Fincra (lightest integration) / Cadana / Sudo — partner holds the money-transmission
license; you integrate only.
**Gate to build:** Phase 1 live, KYC Tier 2 (liveness) working, and a signed partner agreement.
**Reminder:** receive-only. No outbound transfers to third parties — payout only to the user's own
verified NGN bank account. This is what keeps you out of remittance/MSB licensing.

## M7 — Virtual Card Issuing
**Tables:** `cards`, `card_transactions`, `card_disputes`
**Vendor:** Sudo Africa, or evaluate Union54 (watch their fraud posture), or Stripe Issuing where
eligible.
**Gate to build:** M6 live and stable, BIN sponsor approval secured, 3-D Secure integration
mandatory before any card transaction goes live — non-negotiable per the dev spec.
**Reminder:** chargeback-dispute fee (~20%) built into `card_disputes.dispute_fee_minor` to deter
friendly fraud, per spec.

## M8 — Voice (loyalty bundle, not a profit center)
**Tables:** `call_sessions`, `minutes_bundles`
**Vendor:** Twilio or Telnyx (WebRTC).
**Gate to build:** Phase 1 retention data shows users would value a bundled perk; build only as a
reward mechanic ("top up ₦X this month → Y free minutes"), never marketed as a standalone product.

## M9 — B2B: Agents, Bulk VTU, White-Label, Corporate Travel
**Tables:** `agents`, `agent_commissions`, `business_accounts`, `business_directors`,
`bulk_batches`, `bulk_batch_items`, `partner_accounts`, `corporate_travel_orders`
**Gate to build:** Phase 1 VTU/eSIM proven reliable (this is B2B2C — you're vouching for the
product to someone else's customers or employees). Start with `agents` + `bulk_batches` first
(lowest lift, reuses Phase 1 VTU infra entirely — no new compliance tier). `partner_accounts`
(white-label API, e.g. for an FXBud-style remittance app) and `corporate_travel_orders` come after
agents/bulk prove the model.
**KYB note:** `business_accounts.kyb_status` gates all of these — CAC docs + director ID before any
business account transacts at volume.

## M10 — Full Gamification
**Tables:** `user_coin_balances`, `streaks`, `levels` + `user_levels` (seeded: Bronze/Silver/Gold),
`missions` + `user_missions` (seeded: first eSIM, first intl top-up, first electricity, refer a
friend), `leaderboard_snapshots`, `squads` + `squad_members` + `squad_goals`, `referral_codes` +
`referral_conversions`.
**Gate to build:** Phase 1's basic `reward_events` table is running and you have real transaction
volume to gamify. Build order: streaks + coins first (cheapest, highest retention lift per the
profit-impact math already run) → levels → missions → leaderboard → squad goals (most complex,
most novel — do last).
**Budget guardrail carried over from the dev spec:** total reward cost capped at 15% of monthly
gross profit; reward only incremental behavior, never blanket cashback.

## M11 — Notifications
**Tables:** `notifications`, `notification_preferences`
**Gate to build:** as soon as Phase 1 has real transactions to notify about — this one has no hard
dependency and can move earlier if useful (transaction receipts, price-drop alerts).

## M12 — Admin Console (beyond Phase 1 basics)
**Tables:** `admin_users` (with `deactivated_at` for automated offboarding — a named risk-control in
the spec), `fraud_queue` (working queue on top of Phase 1's `risk_flags`), `reconciliation_runs`
(ledger-vs-vendor drift tracking — the automated version of the manual recon script in the Week 11
build-plan task).
**Gate to build:** the moment you have more than one person touching support/fraud/finance — a
single founder can run Phase 1 admin off `risk_flags` and spreadsheets; this tier is for when you
have a team.

---

## Explicitly excluded, by your decision — not a gap
- **Domestic multi-network eSIM** (the Peyflex-style MTN+Airtel+Glo roaming SIM) — different MVNO
  vendor relationship than diaspora travel eSIM; you decided not to build this. If that changes,
  it needs its own schema addition (`multi_network_esim_profiles` or similar) — not in
  `schema_phase2.sql`.
- **Business virtual accounts** (KYB-tier version of M6, higher limits) — folded into
  `business_accounts` + `virtual_accounts` above once both exist; no separate table needed, just a
  join.
- **True P2P remittance** — permanently out of scope per the hard product rule. Never schema this
  without a licensed MTL/MSB structure and separate legal review.

## Suggested build order across all of Phase 2+ (once Phase 1 is live and stable)
1. M11 Notifications (cheap, immediate value)
2. M9 Agents + Bulk VTU (cash-flow floor, reuses existing infra)
3. M10 Gamification: coins + streaks (retention lift, cheap)
4. M6 Virtual Dollar Account (unlocks the hard-currency growth ceiling)
5. M10 rest: levels, missions, leaderboard, squads
6. M9 rest: white-label API, corporate travel
7. M7 Cards (highest compliance bar — last for a reason)
8. M8 Voice (loyalty layer, whenever retention data justifies it)
9. M12 Admin console upgrade (whenever you have a team, not before)
