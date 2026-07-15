import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications/send";

export class NotFoundError extends Error {
  constructor() {
    super("Support request not found");
    this.name = "NotFoundError";
  }
}

export interface SupportMessageRow {
  id: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

export interface SupportReplyRow {
  id: string;
  author_type: "user" | "admin";
  author_id: string;
  body: string;
  created_at: string;
}

export async function createMessage(userId: string, subject: string, body: string): Promise<{ id: string }> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO support_messages (user_id, subject, body) VALUES ($1, $2, $3) RETURNING id`,
    [userId, subject, body]
  );
  await logAudit(userId, "support_message_created", "support_message", rows[0].id, { subject });
  return { id: rows[0].id };
}

export async function listMessagesForUser(userId: string): Promise<SupportMessageRow[]> {
  const { rows } = await query<SupportMessageRow>(
    `SELECT id, subject, body, status, created_at, resolved_at
     FROM support_messages WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

// Thread = the original message rendered as the first entry, plus replies.
export async function getThread(
  messageId: string,
  userId: string
): Promise<{ message: SupportMessageRow; replies: SupportReplyRow[] }> {
  const { rows } = await query<SupportMessageRow>(
    `SELECT id, subject, body, status, created_at, resolved_at FROM support_messages WHERE id = $1 AND user_id = $2`,
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
  const { rows } = await query<{ id: string; status: string }>(
    `SELECT id, status FROM support_messages WHERE id = $1 AND user_id = $2`,
    [messageId, userId]
  );
  if (!rows[0]) throw new NotFoundError();

  await query(
    `INSERT INTO support_replies (message_id, author_type, author_id, body) VALUES ($1, 'user', $2, $3)`,
    [messageId, userId, body]
  );
  // A reply from the user re-opens a resolved ticket — reopening is a
  // status change, never a delete, consistent with the rest of the app.
  if (rows[0].status === "resolved") {
    await query(`UPDATE support_messages SET status = 'open', resolved_at = NULL WHERE id = $1`, [messageId]);
  }
}

// ---- Admin-side ----

export interface AdminSupportRow extends SupportMessageRow {
  phone: string;
  assigned_admin_id: string | null;
}

export async function listMessagesForAdmin(statusFilter?: string): Promise<AdminSupportRow[]> {
  const params: unknown[] = [];
  let sql = `SELECT sm.id, sm.subject, sm.body, sm.status, sm.assigned_admin_id, sm.created_at, sm.resolved_at, u.phone
             FROM support_messages sm JOIN users u ON u.id = sm.user_id`;
  if (statusFilter) {
    params.push(statusFilter);
    sql += ` WHERE sm.status = $1`;
  }
  sql += ` ORDER BY sm.created_at DESC LIMIT 100`;
  const { rows } = await query<AdminSupportRow>(sql, params);
  return rows;
}

export async function addAdminReply(
  messageId: string,
  adminUserId: string,
  body: string,
  resolve: boolean
): Promise<void> {
  const { rows } = await query<{ user_id: string }>(
    `SELECT user_id FROM support_messages WHERE id = $1`,
    [messageId]
  );
  if (!rows[0]) throw new NotFoundError();

  await query(
    `INSERT INTO support_replies (message_id, author_type, author_id, body) VALUES ($1, 'admin', $2, $3)`,
    [messageId, adminUserId, body]
  );
  await query(
    `UPDATE support_messages
     SET assigned_admin_id = COALESCE(assigned_admin_id, $2),
         status = $3,
         resolved_at = CASE WHEN $3 = 'resolved' THEN now() ELSE NULL END
     WHERE id = $1`,
    [messageId, adminUserId, resolve ? "resolved" : "in_progress"]
  );
  await logAudit(adminUserId, "support_reply_sent", "support_message", messageId, { resolve });
  await sendNotification(
    rows[0].user_id,
    "push",
    "support",
    "Support replied",
    resolve ? "Your support request has been resolved." : "You have a new reply on your support request."
  );
}
