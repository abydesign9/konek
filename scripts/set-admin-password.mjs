// Set (or reset) an admin's password directly in the database.
//
// Usage (reads the password from an env var so it never lands in shell history):
//   ADMIN_PW='your-strong-password' node -r dotenv/config scripts/set-admin-password.mjs you@konek.app dotenv_config_path=.env.local
//
// The email must already exist in admin_users (log in once with the shared
// secret to auto-provision it, or invite it from the admin console first).
import bcrypt from "bcryptjs";
import pg from "pg";

const email = (process.argv[2] ?? "").trim().toLowerCase();
const password = process.env.ADMIN_PW ?? "";

if (!email || !email.includes("@")) {
  console.error("Pass the admin email as the first argument.");
  process.exit(1);
}
if (password.length < 10) {
  console.error("Set ADMIN_PW to a password of at least 10 characters.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const hash = await bcrypt.hash(password, 10);
const { rowCount } = await pool.query(
  `UPDATE admin_users SET password_hash = $2, password_set_at = now() WHERE email = $1`,
  [email, hash]
);
if (rowCount === 0) {
  console.error(`No admin_users row for ${email}. Create it first (log in with the shared secret, or invite it).`);
  process.exit(1);
}
console.log(`Password set for ${email}. You can now log in with email + password.`);
await pool.end();
