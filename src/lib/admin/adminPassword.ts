import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type { AdminUser } from "./adminUsers";

// Per-admin password auth. Each admin_users row carries its own bcrypt hash;
// login verifies email + password. The shared ADMIN_SECRET remains only as a
// bootstrap fallback (see session.ts) and as the cookie-signing key.

export class WeakPasswordError extends Error {
  constructor() {
    super("Password must be at least 10 characters");
    this.name = "WeakPasswordError";
  }
}

interface AdminAuthRow {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  active: boolean;
  password_hash: string | null;
}

async function fetchAuthRow(email: string): Promise<AdminAuthRow | null> {
  const { rows } = await query<AdminAuthRow>(
    `SELECT id, email, full_name, role, active, password_hash FROM admin_users WHERE email = $1`,
    [email.trim().toLowerCase()]
  );
  return rows[0] ?? null;
}

// True when this admin has set a password (so login must use it, not the secret).
export async function adminHasPassword(email: string): Promise<boolean> {
  const row = await fetchAuthRow(email);
  return Boolean(row?.active && row.password_hash);
}

// Verify email + password. Returns the admin on success, null otherwise.
export async function verifyAdminPassword(email: string, password: string): Promise<AdminUser | null> {
  const row = await fetchAuthRow(email);
  if (!row || !row.active || !row.password_hash) return null;
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return null;
  return { id: row.id, email: row.email, fullName: row.full_name, role: row.role, active: row.active };
}

// Set (or reset) an admin's password. Used by the self-service change-password
// flow and the setup CLI.
export async function setAdminPassword(userId: string, newPassword: string, actorId: string): Promise<void> {
  if (newPassword.length < 10) throw new WeakPasswordError();
  const hash = await bcrypt.hash(newPassword, 10);
  await query(`UPDATE admin_users SET password_hash = $2, password_set_at = now() WHERE id = $1`, [userId, hash]);
  await logAudit(actorId, "admin_password_set", "admin_user", userId, {});
}
