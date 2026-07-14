import { query } from "@/lib/db";

// Append-only system-wide log (distinct from transaction_events, which is
// scoped to a single transaction's state machine). No deletes — financial
// and access-relevant actions land here regardless of which entity they
// touch, so `actor` can be a user id, 'system', or an admin identifier.
export async function logAudit(
  actor: string,
  action: string,
  entity?: string,
  entityId?: string,
  detail?: Record<string, unknown>
): Promise<void> {
  await query(
    `INSERT INTO audit_log (actor, action, entity, entity_id, detail) VALUES ($1, $2, $3, $4, $5)`,
    [actor, action, entity ?? null, entityId ?? null, detail ? JSON.stringify(detail) : null]
  );
}
