import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export interface AdminUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  active: boolean;
}

function allowlistedEmails(): string[] {
  return (process.env.ADMIN_ALLOWLIST_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function findActiveAdminByEmail(email: string): Promise<AdminUser | null> {
  const normalized = email.trim().toLowerCase();
  const { rows } = await query<{ id: string; email: string; full_name: string | null; role: string; active: boolean }>(
    `SELECT id, email, full_name, role, active FROM admin_users WHERE email = $1`,
    [normalized]
  );
  const row = rows[0];
  if (row && row.active) {
    return { id: row.id, email: row.email, fullName: row.full_name, role: row.role, active: row.active };
  }
  if (row && !row.active) return null;

  // Bootstrap: the very first login from an ADMIN_ALLOWLIST_EMAILS address
  // auto-provisions a super_admin row, so there's a way in before any
  // admin_users rows exist. Every login after that must match an existing
  // active row.
  const { rows: countRows } = await query<{ count: string }>(`SELECT count(*) FROM admin_users`);
  const noAdminsYet = Number(countRows[0].count) === 0;
  if (noAdminsYet && allowlistedEmails().includes(normalized)) {
    const { rows: created } = await query<{ id: string }>(
      `INSERT INTO admin_users (email, role) VALUES ($1, 'super_admin') RETURNING id`,
      [normalized]
    );
    await logAudit(created[0].id, "admin_bootstrapped", "admin_user", created[0].id);
    return { id: created[0].id, email: normalized, fullName: null, role: "super_admin", active: true };
  }

  return null;
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const { rows } = await query<{ id: string; email: string; full_name: string | null; role: string; active: boolean }>(
    `SELECT id, email, full_name, role, active FROM admin_users ORDER BY created_at DESC`
  );
  return rows.map((r) => ({ id: r.id, email: r.email, fullName: r.full_name, role: r.role, active: r.active }));
}

export async function inviteAdminUser(email: string, role: string, actorId: string): Promise<{ id: string }> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO admin_users (email, role) VALUES ($1, $2) RETURNING id`,
    [email.trim().toLowerCase(), role]
  );
  await logAudit(actorId, "admin_user_invited", "admin_user", rows[0].id, { email, role });
  return { id: rows[0].id };
}

// Named risk control from the spec: deactivation is explicit and logged,
// never a silent delete — admin_users rows are never removed.
export async function deactivateAdminUser(id: string, actorId: string): Promise<void> {
  await query(`UPDATE admin_users SET active = false, deactivated_at = now() WHERE id = $1`, [id]);
  await logAudit(actorId, "admin_user_deactivated", "admin_user", id);
}
