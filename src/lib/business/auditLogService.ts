import { query } from "@/lib/db";

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
  actor_name: string | null;
}

// Every business-scoped logAudit call carries { businessId } in its detail
// (see the business/* services), except business_account-entity events, which
// already use the business id as entity_id — this covers both.
export async function listBusinessAuditLog(businessId: string): Promise<AuditEntry[]> {
  const { rows } = await query<AuditEntry>(
    `SELECT a.id, a.actor, a.action, a.entity, a.entity_id, a.detail, a.created_at,
            u.full_name AS actor_name
     FROM audit_log a
     LEFT JOIN users u ON u.id::text = a.actor
     WHERE a.detail->>'businessId' = $1
        OR (a.entity = 'business_account' AND a.entity_id = $1)
     ORDER BY a.created_at DESC
     LIMIT 100`,
    [businessId]
  );
  return rows;
}
