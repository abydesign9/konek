import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// Admin-side customer directory and account actions. Blocking a customer sets
// their status and revokes every session so the lockout is immediate (login
// already refuses non-active accounts). We never hard delete a customer with a
// financial history — an account is deactivated (status = closed), never removed.

export type CustomerStatus = "active" | "suspended" | "closed";

export interface CustomerRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string;
  country_code: string;
  status: string;
  kyc_tier: number;
  kyc_status: string;
  ngn_minor: number;
  usd_minor: number;
  created_at: string;
}

export async function listCustomers(search: string | null, limit = 50): Promise<CustomerRow[]> {
  const params: unknown[] = [];
  let where = "";
  if (search) {
    params.push(`%${search}%`);
    where = `WHERE u.full_name ILIKE $1 OR u.email ILIKE $1 OR u.phone ILIKE $1 OR u.id::text ILIKE $1`;
  }
  params.push(limit);
  const { rows } = await query<CustomerRow>(
    `SELECT u.id, u.full_name, u.email, u.phone, u.country_code, u.status,
            u.kyc_tier, u.kyc_status, u.created_at,
            COALESCE((SELECT ab.balance_minor FROM ledger_accounts la
                        JOIN account_balances ab ON ab.account_id = la.id
                       WHERE la.owner_type='user' AND la.owner_id=u.id AND la.kind='wallet' AND la.currency='NGN'), 0) AS ngn_minor,
            COALESCE((SELECT ab.balance_minor FROM ledger_accounts la
                        JOIN account_balances ab ON ab.account_id = la.id
                       WHERE la.owner_type='user' AND la.owner_id=u.id AND la.kind='wallet' AND la.currency='USD'), 0) AS usd_minor
       FROM users u
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${params.length}`,
    params
  );
  return rows.map((r) => ({ ...r, ngn_minor: Number(r.ngn_minor), usd_minor: Number(r.usd_minor) }));
}

export class CustomerNotFoundError extends Error {
  constructor() {
    super("Customer not found");
    this.name = "CustomerNotFoundError";
  }
}

// Change a customer's account status. Suspend/close both revoke live sessions so
// the change bites right away; reactivating simply restores access at next login.
export async function setCustomerStatus(userId: string, status: CustomerStatus, actorId: string): Promise<void> {
  const { rows } = await query<{ status: string }>(`SELECT status FROM users WHERE id = $1`, [userId]);
  if (!rows[0]) throw new CustomerNotFoundError();

  await query(`UPDATE users SET status = $2, updated_at = now() WHERE id = $1`, [userId, status]);
  if (status !== "active") {
    await query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
  }
  await logAudit(actorId, "customer_status_changed", "user", userId, { from: rows[0].status, to: status });
}
