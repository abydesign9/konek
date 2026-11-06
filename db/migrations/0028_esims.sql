-- ============================================================
-- Raviion — Migration 0028: eSIM lifecycle records
--
-- eSIMs are purchased through the generic VTU/reservation path (service_type
-- 'esim'), but they have a real post-purchase lifecycle the transaction row
-- can't express: an ICCID + SM-DP+ activation details, a data allowance that
-- depletes, and an expiry. This table tracks that per issued eSIM. Usage is
-- refreshed from the fulfilling provider via the EsimProvider abstraction.
--
-- Additive only.
-- ============================================================

CREATE TABLE IF NOT EXISTS esims (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          uuid NOT NULL REFERENCES users(id),
  txn_id           uuid NOT NULL UNIQUE REFERENCES transactions(id),
  provider         text NOT NULL,                 -- fulfilling vendor id
  plan_external_id text,
  iccid            text,                            -- may arrive async (null until provisioned)
  smdp_address     text,                            -- SM-DP+ server for activation
  matching_id      text,                            -- activation matching id
  activation_code  text,                            -- full LPA string, if the provider supplies one
  status           text NOT NULL DEFAULT 'issued'
                     CHECK (status IN ('issued','installed','active','depleted','expired','revoked')),
  total_mb         bigint,                          -- data allowance (null = unknown)
  used_mb          bigint NOT NULL DEFAULT 0,
  expires_at       timestamptz,
  usage_synced_at  timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_esims_user ON esims (user_id, created_at DESC);
-- The usage-refresh sweep only cares about eSIMs that can still change.
CREATE INDEX IF NOT EXISTS idx_esims_live ON esims (usage_synced_at)
  WHERE status IN ('issued','installed','active');
