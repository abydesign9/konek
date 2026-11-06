-- ============================================================
-- Raviion — Migration 0034: linked bank accounts for withdrawals
--
-- Users withdraw their OWN wallet funds to their OWN bank account (never P2P /
-- send-to-others). Each row is a payout destination the user has linked. The
-- account number is sensitive PII, so it is stored AES-256-GCM encrypted (jsonb
-- envelope via src/lib/crypto/pii, bound to the owner); only the last 4 digits
-- are kept in the clear for display. See [[pii-encryption-standard]].
--
-- The withdrawal itself is a normal row in `transactions` (type='withdrawal')
-- with a `reservations` hold, reusing the reserve/settle/release ledger path —
-- no separate status table.
--
-- Additive only.
-- ============================================================

CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id),
  bank_code text NOT NULL,
  bank_name text NOT NULL,
  account_name text NOT NULL,
  account_number_encrypted jsonb NOT NULL,
  account_number_last4 text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, bank_code, account_number_last4)
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON bank_accounts (user_id, created_at DESC);
