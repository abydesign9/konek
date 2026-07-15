import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications/send";
import { sendExternalAlert } from "@/lib/alerts/externalAlert";

export class NotFoundError extends Error {
  constructor() {
    super("Support request not found");
    this.name = "NotFoundError";
  }
}

export type SupportStatus = "open" | "assigned" | "waiting_on_customer" | "resolved" | "closed";
export type SupportPriority = "low" | "medium" | "high" | "urgent";

// Hours-to-resolve target per priority, used to compute sla_due_at. A
// simple, honest stand-in for a full SLA policy engine.
const SLA_HOURS: Record<SupportPriority, number> = { urgent: 2, high: 8, medium: 24, low: 72 };

export interface SupportMessageRow {
  id: string;
  subject: string;
  body: string;
  status: string;
  category: string | null;
  priority: SupportPriority;
  sla_due_at: string | null;
  created_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

export interface SupportReplyRow {
  id: string;
  author_type: "user" | "admin";
  author_id: string;
  body: string;
  created_at: string;
}

async function recordStatusEvent(
  messageId: string,
  fromStatus: string | null,
  toStatus: string,
  actorType: "user" | "admin" | "system",
  actorId: string | null
): Promise<void> {
  await query(
    `INSERT INTO support_status_events (message_id, from_status, to_status, actor_type, actor_id) VALUES ($1, $2, $3, $4, $5)`,
    [messageId, fromStatus, toStatus, actorType, actorId]
  );
}

export async function createMessage(
  userId: string,
  subject: string,
  body: string,
  category?: string,
  priority: SupportPriority = "medium"
): Promise<{ id: string }> {
  const slaDueAt = new Date(Date.now() + SLA_HOURS[priority] * 3_600_000);
  const { rows } = await query<{ id: string }>(
    `INSERT INTO support_messages (user_id, subject, body, category, priority, sla_due_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [userId, subject, body, category ?? null, priority, slaDueAt.toISOString()]
  );
  const id = rows[0].id;
  await recordStatusEvent(id, null, "open", "user", userId);
  await logAudit(userId, "support_message_created", "support_message", id, { subject, category, priority });
  await sendExternalAlert("support_ticket_created", `New ${priority} ticket: ${subject}`, { messageId: id, category });
  return { id };
}

export async function listMessagesForUser(userId: string): Promise<SupportMessageRow[]> {
  const { rows } = await query<SupportMessageRow>(
    `SELECT id, subject, body, status, category, priority, sla_due_at, created_at, resolved_at, closed_at
     FROM support_messages WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

// Thread = the original message rendered as the first entry, plus replies.
// Customer-facing — never includes internal notes.
export async function getThread(
  messageId: string,
  userId: string
): Promise<{ message: SupportMessageRow; replies: SupportReplyRow[] }> {
  const { rows } = await query<SupportMessageRow>(
    `SELECT id, subject, body, status, category, priority, sla_due_at, created_at, resolved_at, closed_at
     FROM support_messages WHERE id = $1 AND user_id = $2`,
    [messageId, userId]
  );
  if (!rows[0]) throw new NotFoundError();

  const { rows: replies } = await query<SupportReplyRow>(
    `SELECT id, author_type, author_id, body, created_at FROM support_replies WHERE message_id = $1 ORDER BY created_at ASC`,
    [messageId]
  );
  return { message: rows[0], replies };
}

export async function addUserReply(messageId: string, userId: string, body: string): Promise<void> {
  const { rows } = await query<{ id: string; status: string; assigned_admin_id: string | null }>(
    `SELECT id, status, assigned_admin_id FROM support_messages WHERE id = $1 AND user_id = $2`,
    [messageId, userId]
  );
  if (!rows[0]) throw new NotFoundError();
  const current = rows[0];

  await query(
    `INSERT INTO support_replies (message_id, author_type, author_id, body) VALUES ($1, 'user', $2, $3)`,
    [messageId, userId, body]
  );

  // A reply from the user always clears "waiting on customer" and reopens a
  // resolved/closed ticket — reopening is a status change, never a delete.
  const nextStatus: SupportStatus = current.assigned_admin_id ? "assigned" : "open";
  if (current.status !== nextStatus) {
    await query(
      `UPDATE support_messages SET status = $2, resolved_at = NULL, closed_at = NULL WHERE id = $1`,
      [messageId, nextStatus]
    );
    await recordStatusEvent(messageId, current.status, nextStatus, "user", userId);
  }
}

// ---- Admin-side ----

export interface AdminSupportRow extends SupportMessageRow {
  phone: string;
  assigned_admin_id: string | null;
  assigned_admin_email: string | null;
}

const OPEN_BUCKET: SupportStatus[] = ["open", "assigned", "waiting_on_customer"];
const CLOSED_BUCKET: SupportStatus[] = ["resolved", "closed"];

export async function listMessagesForAdmin(filters: {
  status?: string;
  category?: string;
  priority?: string;
}): Promise<AdminSupportRow[]> {
  const params: unknown[] = [];
  let sql = `SELECT sm.id, sm.subject, sm.body, sm.status, sm.category, sm.priority, sm.sla_due_at,
                    sm.assigned_admin_id, au.email AS assigned_admin_email,
                    sm.created_at, sm.resolved_at, sm.closed_at, u.phone
             FROM support_messages sm
             JOIN users u ON u.id = sm.user_id
             LEFT JOIN admin_users au ON au.id = sm.assigned_admin_id
             WHERE 1=1`;
  if (filters.status === "open_bucket") {
    sql += ` AND sm.status = ANY($${params.push(OPEN_BUCKET)})`;
  } else if (filters.status === "closed_bucket") {
    sql += ` AND sm.status = ANY($${params.push(CLOSED_BUCKET)})`;
  } else if (filters.status) {
    sql += ` AND sm.status = $${params.push(filters.status)}`;
  }
  if (filters.category) sql += ` AND sm.category = $${params.push(filters.category)}`;
  if (filters.priority) sql += ` AND sm.priority = $${params.push(filters.priority)}`;
  sql += ` ORDER BY sm.created_at DESC LIMIT 200`;

  const { rows } = await query<AdminSupportRow>(sql, params);
  return rows;
}

export async function getAdminThread(messageId: string): Promise<{
  message: AdminSupportRow;
  replies: SupportReplyRow[];
  notes: { id: string; admin_id: string; admin_email: string; body: string; created_at: string }[];
  timeline: { from_status: string | null; to_status: string; actor_type: string; created_at: string }[];
}> {
  const { rows } = await query<AdminSupportRow>(
    `SELECT sm.id, sm.subject, sm.body, sm.status, sm.category, sm.priority, sm.sla_due_at,
            sm.assigned_admin_id, au.email AS assigned_admin_email,
            sm.created_at, sm.resolved_at, sm.closed_at, u.phone
     FROM support_messages sm
     JOIN users u ON u.id = sm.user_id
     LEFT JOIN admin_users au ON au.id = sm.assigned_admin_id
     WHERE sm.id = $1`,
    [messageId]
  );
  if (!rows[0]) throw new NotFoundError();

  const { rows: replies } = await query<SupportReplyRow>(
    `SELECT id, author_type, author_id, body, created_at FROM support_replies WHERE message_id = $1 ORDER BY created_at ASC`,
    [messageId]
  );
  const { rows: notes } = await query<{ id: string; admin_id: string; admin_email: string; body: string; created_at: string }>(
    `SELECT sn.id, sn.admin_id, au.email AS admin_email, sn.body, sn.created_at
     FROM support_notes sn JOIN admin_users au ON au.id = sn.admin_id
     WHERE sn.message_id = $1 ORDER BY sn.created_at ASC`,
    [messageId]
  );
  const { rows: timeline } = await query<{ from_status: string | null; to_status: string; actor_type: string; created_at: string }>(
    `SELECT from_status, to_status, actor_type, created_at FROM support_status_events
     WHERE message_id = $1 ORDER BY created_at ASC`,
    [messageId]
  );

  return { message: rows[0], replies, notes, timeline };
}

export async function assignTicket(messageId: string, adminUserId: string, actorId: string): Promise<void> {
  const { rows } = await query<{ status: string }>(`SELECT status FROM support_messages WHERE id = $1`, [messageId]);
  if (!rows[0]) throw new NotFoundError();

  const nextStatus: SupportStatus = rows[0].status === "open" ? "assigned" : (rows[0].status as SupportStatus);
  await query(
    `UPDATE support_messages SET assigned_admin_id = $2, status = $3 WHERE id = $1`,
    [messageId, adminUserId, nextStatus]
  );
  if (rows[0].status !== nextStatus) await recordStatusEvent(messageId, rows[0].status, nextStatus, "admin", actorId);
  await logAudit(actorId, "support_ticket_assigned", "support_message", messageId, { adminUserId });
}

export async function addAdminReply(
  messageId: string,
  adminUserId: string,
  body: string,
  resolve: boolean
): Promise<void> {
  const { rows } = await query<{ user_id: string; status: string }>(
    `SELECT user_id, status FROM support_messages WHERE id = $1`,
    [messageId]
  );
  if (!rows[0]) throw new NotFoundError();
  const current = rows[0];

  await query(
    `INSERT INTO support_replies (message_id, author_type, author_id, body) VALUES ($1, 'admin', $2, $3)`,
    [messageId, adminUserId, body]
  );

  const nextStatus: SupportStatus = resolve ? "resolved" : "waiting_on_customer";
  await query(
    `UPDATE support_messages
     SET assigned_admin_id = COALESCE(assigned_admin_id, $2),
         status = $3,
         resolved_at = CASE WHEN $3 = 'resolved' THEN now() ELSE NULL END
     WHERE id = $1`,
    [messageId, adminUserId, nextStatus]
  );
  await recordStatusEvent(messageId, current.status, nextStatus, "admin", adminUserId);
  await logAudit(adminUserId, "support_reply_sent", "support_message", messageId, { resolve });
  await sendNotification(
    current.user_id,
    "push",
    "support",
    "Support replied",
    resolve ? "Your support request has been resolved." : "You have a new reply on your support request."
  );
}

export async function closeTicket(messageId: string, actorId: string): Promise<void> {
  const { rows } = await query<{ status: string }>(`SELECT status FROM support_messages WHERE id = $1`, [messageId]);
  if (!rows[0]) throw new NotFoundError();

  await query(`UPDATE support_messages SET status = 'closed', closed_at = now() WHERE id = $1`, [messageId]);
  await recordStatusEvent(messageId, rows[0].status, "closed", "admin", actorId);
  await logAudit(actorId, "support_ticket_closed", "support_message", messageId);
}

export async function setCategoryAndPriority(
  messageId: string,
  category: string | null,
  priority: SupportPriority,
  actorId: string
): Promise<void> {
  const { rows } = await query<{ created_at: string }>(
    `SELECT created_at FROM support_messages WHERE id = $1`,
    [messageId]
  );
  if (!rows[0]) throw new NotFoundError();

  const slaDueAt = new Date(new Date(rows[0].created_at).getTime() + SLA_HOURS[priority] * 3_600_000);
  await query(
    `UPDATE support_messages SET category = $2, priority = $3, sla_due_at = $4 WHERE id = $1`,
    [messageId, category, priority, slaDueAt.toISOString()]
  );
  await logAudit(actorId, "support_ticket_categorized", "support_message", messageId, { category, priority });
}

export async function addInternalNote(messageId: string, adminId: string, body: string): Promise<{ id: string }> {
  const { rows: exists } = await query<{ id: string }>(`SELECT id FROM support_messages WHERE id = $1`, [messageId]);
  if (!exists[0]) throw new NotFoundError();

  const { rows } = await query<{ id: string }>(
    `INSERT INTO support_notes (message_id, admin_id, body) VALUES ($1, $2, $3) RETURNING id`,
    [messageId, adminId, body]
  );
  await logAudit(adminId, "support_internal_note_added", "support_message", messageId);
  return { id: rows[0].id };
}

export interface SupportStats {
  total: number;
  open: number;
  assigned: number;
  waitingOnCustomer: number;
  resolved: number;
  closed: number;
  slaBreached: number;
  byPriority: Record<string, number>;
}

export async function getSupportStats(): Promise<SupportStats> {
  const { rows } = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*) AS count FROM support_messages GROUP BY status`
  );
  const byStatus: Record<string, number> = {};
  for (const r of rows) byStatus[r.status] = Number(r.count);

  const { rows: priorityRows } = await query<{ priority: string; count: string }>(
    `SELECT priority, COUNT(*) AS count FROM support_messages GROUP BY priority`
  );
  const byPriority: Record<string, number> = {};
  for (const r of priorityRows) byPriority[r.priority] = Number(r.count);

  const { rows: slaRows } = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM support_messages
     WHERE status = ANY($1) AND sla_due_at IS NOT NULL AND sla_due_at < now()`,
    [OPEN_BUCKET]
  );

  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  return {
    total,
    open: byStatus.open ?? 0,
    assigned: byStatus.assigned ?? 0,
    waitingOnCustomer: byStatus.waiting_on_customer ?? 0,
    resolved: byStatus.resolved ?? 0,
    closed: byStatus.closed ?? 0,
    slaBreached: Number(slaRows[0]?.count ?? 0),
    byPriority,
  };
}
