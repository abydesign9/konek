-- Applications to Raviion's community programs (Campus Ambassadors, Influencers,
-- Creator Club). These are PUBLIC marketing lead forms — a submission does NOT
-- create an app account or touch the ledger. Admins review them and export CSV.
-- Program-specific answers live in `details` (jsonb) so each program can ask its
-- own questions without a schema change; common contact fields are columns so
-- CSV export and scanning stay simple.
CREATE TABLE program_applications (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  program     text NOT NULL CHECK (program IN ('ambassador', 'influencer', 'creator_club')),
  full_name   text NOT NULL,
  email       text NOT NULL,
  phone       text,
  country     text,
  details     jsonb NOT NULL DEFAULT '{}',
  status      text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'accepted', 'rejected')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX program_applications_program_created_idx ON program_applications (program, created_at DESC);
CREATE INDEX program_applications_status_idx ON program_applications (status);
