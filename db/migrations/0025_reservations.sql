-- ============================================================
-- KONEK — Migration 0025: reservation lifecycle for the spend path
--
-- Closes the M2 double-spend race. Previously the wallet was debited AFTER the
-- vendor call, with a non-atomic balance pre-check, so concurrent purchases
-- could both pass the check, both deliver, and drive the wallet negative.
--
-- This introduces reservations as a first-class ledger concept:
--   reservation : debit user wallet, credit platform reserve  (BEFORE vendor)
--   settlement  : debit reserve, credit vendor float          (vendor success)
--   release     : debit reserve, credit user wallet           (vendor failure)
--   refund      : reversal of a delivered transaction's net effect
--
-- Plus a hard DB floor: a wallet balance can never go negative, so no
-- application bug, race, or manual write can overdraw a user wallet.
--
-- Additive only. Existing journals get NULL journal_type (unclassified legacy).
-- ============================================================

-- ---------- 1. Non-negative wallet guard ----------
-- BEFORE INSERT OR UPDATE on the cached balance. Only wallet accounts are
-- constrained; platform / reserve / vendor-float / gateway accounts legitimately
-- hold negative balances. Raised as check_violation (SQLSTATE 23514) with a
-- stable token the app maps to InsufficientBalanceError.
CREATE OR REPLACE FUNCTION enforce_wallet_nonneg() RETURNS trigger AS $$
DECLARE
  v_kind      text;
  v_existing  bigint;
  v_effective bigint;
BEGIN
  SELECT kind INTO v_kind FROM ledger_accounts WHERE id = NEW.account_id;
  IF v_kind <> 'wallet' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- The balance cache is written with INSERT .. ON CONFLICT DO UPDATE, so a
    -- BEFORE INSERT firing carries the raw delta (e.g. -10000), NOT the merged
    -- balance. Evaluate the effective resulting balance so a debit against an
    -- already-funded wallet isn't rejected. (The conflict/UPDATE path is still
    -- backstopped below, which is what actually serialises concurrent debits.)
    SELECT balance_minor INTO v_existing FROM account_balances WHERE account_id = NEW.account_id;
    v_effective := COALESCE(v_existing, 0) + NEW.balance_minor;
    IF v_effective < 0 THEN
      RAISE EXCEPTION 'wallet_insufficient_funds: account % would reach %', NEW.account_id, v_effective
        USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    -- UPDATE path (including the DO UPDATE of an upsert): NEW.balance_minor is
    -- the final, post-merge balance. This is the authoritative guard.
    IF NEW.balance_minor < 0 THEN
      RAISE EXCEPTION 'wallet_insufficient_funds: account % would reach %', NEW.account_id, NEW.balance_minor
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wallet_nonneg ON account_balances;
CREATE TRIGGER wallet_nonneg
  BEFORE INSERT OR UPDATE ON account_balances
  FOR EACH ROW EXECUTE FUNCTION enforce_wallet_nonneg();

-- ---------- 2. First-class journal types ----------
ALTER TABLE journals ADD COLUMN IF NOT EXISTS journal_type text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'journals_type_chk') THEN
    ALTER TABLE journals ADD CONSTRAINT journals_type_chk CHECK (
      journal_type IS NULL OR journal_type IN
        ('reservation','settlement','release','refund','funding','reward','adjustment','purchase')
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_journals_txn ON journals (txn_id);

-- ---------- 3. Reservations ----------
CREATE TABLE IF NOT EXISTS reservations (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  txn_id                 uuid NOT NULL UNIQUE REFERENCES transactions(id),
  user_id                uuid NOT NULL REFERENCES users(id),
  wallet_account_id      uuid NOT NULL REFERENCES ledger_accounts(id),
  reserve_account_id     uuid NOT NULL REFERENCES ledger_accounts(id),
  amount_minor           bigint NOT NULL CHECK (amount_minor > 0),
  currency               char(3) NOT NULL,
  status                 text NOT NULL DEFAULT 'held' CHECK (status IN ('held','settled','released')),
  reservation_journal_id uuid REFERENCES journals(id),
  settlement_journal_id  uuid REFERENCES journals(id),
  release_journal_id     uuid REFERENCES journals(id),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- The recovery worker scans held reservations by age; partial index keeps it cheap.
CREATE INDEX IF NOT EXISTS idx_reservations_held ON reservations (created_at) WHERE status = 'held';
