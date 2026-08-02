-- Allow 'transfer' as a journal_type: used by internal wallet-to-wallet moves
-- (e.g. owner funding their business wallet) that are neither a spend
-- reservation/settlement nor an external funding/refund event.
ALTER TABLE journals DROP CONSTRAINT journals_type_chk;
ALTER TABLE journals ADD CONSTRAINT journals_type_chk
  CHECK (journal_type IS NULL OR journal_type = ANY (ARRAY[
    'reservation', 'settlement', 'release', 'refund', 'funding',
    'reward', 'adjustment', 'purchase', 'transfer'
  ]));
