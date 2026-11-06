-- ============================================================
-- Raviion — Migration 0023: durable rate limiting + PIN lockout + phone verification
--
-- Fixes M1 review findings:
--   * Rate limiting was an in-process Map (rateLimit.ts). On a serverless
--     deployment (Vercel) that state is per-instance and non-shared, so login
--     brute-force, OTP/SMS-cost bombing and paid-KYC-lookup abuse were only
--     nominally protected. This moves the limiter into Postgres so all
--     instances share one authoritative, atomic counter.
--   * No lockout existed on transaction-PIN verification — a 4-digit PIN is a
--     10k space. pin_failed_attempts / pin_locked_until add a DB-enforced lock.
--   * phone_verified supports the email-primary / phone-verified-once auth model
--     (phone stops being a login door; it is a one-time verified channel used
--     for recovery + verification only).
--
-- Additive only. No renames, no drops. Safe to apply on top of 0001–0022.
-- ============================================================

-- ---------- Durable, atomic fixed-window rate limiter ----------
CREATE TABLE IF NOT EXISTS rate_limit_counters (
  key           text    NOT NULL,
  window_start  bigint  NOT NULL,          -- epoch ms of the fixed-window bucket
  count         integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

-- Supports the opportunistic cleanup below and any scheduled sweep.
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_counters (window_start);

-- Atomically records one hit against (key, window) and reports whether the
-- caller is still within budget. Concurrency-safe: the INSERT .. ON CONFLICT
-- DO UPDATE takes a row lock, so parallel requests increment the same counter
-- correctly rather than racing to a stale value. Also prunes this key's stale
-- buckets so the table stays bounded without a separate sweep.
CREATE OR REPLACE FUNCTION rl_hit(p_key text, p_window_start bigint, p_max integer)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM rate_limit_counters
   WHERE key = p_key AND window_start < p_window_start;

  INSERT INTO rate_limit_counters (key, window_start, count)
       VALUES (p_key, p_window_start, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET count = rate_limit_counters.count + 1
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

-- ---------- PIN lockout + phone verification flag ----------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pin_failed_attempts smallint     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until    timestamptz,
  ADD COLUMN IF NOT EXISTS phone_verified      boolean       NOT NULL DEFAULT false;
