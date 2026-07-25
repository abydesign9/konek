-- Per-admin passwords. Admin auth was one shared secret (ADMIN_SECRET) plus an
-- allowlisted email; this gives each admin_users row its own bcrypt password.
-- The shared secret still works as a bootstrap/fallback until an admin sets a
-- password, and ADMIN_SECRET stays in use only as the server-side key that
-- signs the admin session cookie (not a login credential).
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS password_hash   text,
  ADD COLUMN IF NOT EXISTS password_set_at timestamptz;
