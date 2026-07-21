CREATE TABLE IF NOT EXISTS kyc_documents (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  document_type text NOT NULL CHECK (
    document_type IN (
      'national_id',
      'passport',
      'driver_license'
    )
  ),

  front_storage_key text NOT NULL,
  back_storage_key text,

  front_original_name text NOT NULL,
  back_original_name text,

  front_mime_type text NOT NULL,
  back_mime_type text,

  status text NOT NULL DEFAULT 'uploaded' CHECK (
    status IN (
      'uploaded',
      'pending',
      'approved',
      'rejected',
      'superseded'
    )
  ),

  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS
  kyc_documents_one_active_submission_per_user
ON kyc_documents(user_id)
WHERE status IN ('uploaded', 'pending');

CREATE INDEX IF NOT EXISTS
  kyc_documents_status_created_idx
ON kyc_documents(status, created_at DESC);

CREATE INDEX IF NOT EXISTS
  kyc_documents_user_created_idx
ON kyc_documents(user_id, created_at DESC);
