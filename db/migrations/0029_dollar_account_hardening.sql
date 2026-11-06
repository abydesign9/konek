-- ============================================================
-- Raviion — Migration 0029: dollar-account hardening (M6)
--
-- Defense-in-depth dedup for USD inflows and one-account-per-currency, backing
-- the application-level guards in dollarAccountService.
--
-- Additive only. (If existing data violates these, dedupe first — expected
-- empty in staging.)
-- ============================================================

-- Each provider inflow reference credits at most once.
CREATE UNIQUE INDEX IF NOT EXISTS uq_va_inflows_provider_ref
  ON virtual_account_inflows (provider_ref);

-- A user has at most one virtual account per currency (USD today; GBP/EUR later).
CREATE UNIQUE INDEX IF NOT EXISTS uq_virtual_accounts_user_currency
  ON virtual_accounts (user_id, currency);
