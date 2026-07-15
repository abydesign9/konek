// Provision a customer + admin identity. Local/dev helper — run against
// whatever DATABASE_URL points at (localhost by default). To run against a
// live DB, set DATABASE_URL to that connection string first.
//
//   node -r dotenv/config scripts/provision_admin.mjs dotenv_config_path=.env.local
//
// Env it reads (with sensible fallbacks matching this request):
//   PROVISION_PHONE   default +2347040147477
//   PROVISION_EMAIL   default toptonmedia@gmail.com
//   PROVISION_SECRET  default 739333   (used as the customer PIN)
import pg from "pg";
import bcrypt from "bcryptjs";

const PHONE = process.env.PROVISION_PHONE ?? "+2347040147477";
const EMAIL = (process.env.PROVISION_EMAIL ?? "toptonmedia@gmail.com").toLowerCase();
const PIN = process.env.PROVISION_SECRET ?? "739333";

if (!/^\+\d{7,15}$/.test(PHONE)) throw new Error(`PHONE must be E.164, got ${PHONE}`);
if (!/^\d{4,6}$/.test(PIN)) throw new Error("PIN must be 4-6 digits");
if (!EMAIL.includes("@")) throw new Error("EMAIL must be a real email address");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");

  // ---- Customer (phone-based user) ----
  const pinHash = await bcrypt.hash(PIN, 10);
  const existing = await client.query("SELECT id FROM users WHERE phone = $1", [PHONE]);
  let userId;
  if (existing.rows[0]) {
    userId = existing.rows[0].id;
    await client.query(
      `UPDATE users SET pin_hash = $2, kyc_tier = GREATEST(kyc_tier, 2), kyc_status = 'verified',
                        bvn_verified = true, liveness_verified = true, updated_at = now()
       WHERE id = $1`,
      [userId, pinHash]
    );
  } else {
    const code = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const created = await client.query(
      `INSERT INTO users (phone, full_name, kyc_tier, kyc_status, bvn_verified, liveness_verified, pin_hash, referral_code)
       VALUES ($1, 'Topton Media', 2, 'verified', true, true, $2, $3) RETURNING id`,
      [PHONE, pinHash, code]
    );
    userId = created.rows[0].id;
    await client.query(`INSERT INTO referral_codes (code, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [code, userId]);
  }

  // ---- Admin (email-based, in admin_users) ----
  await client.query(
    `INSERT INTO admin_users (email, full_name, role, active)
     VALUES ($1, 'Topton Media', 'super_admin', true)
     ON CONFLICT (email) DO UPDATE SET role = 'super_admin', active = true, deactivated_at = NULL`,
    [EMAIL]
  );

  await client.query("COMMIT");
  console.log("Provisioned:");
  console.log(`  customer  phone=${PHONE}  userId=${userId}  PIN set (${PIN.length} digits)`);
  console.log(`  admin     email=${EMAIL}  role=super_admin  active`);
  console.log(`Reminder: admin login needs ADMIN_SECRET=${PIN} and ADMIN_ALLOWLIST_EMAILS to include ${EMAIL}.`);
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  client.release();
  await pool.end();
}
