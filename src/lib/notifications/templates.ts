import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export class NotFoundError extends Error {
  constructor() {
    super("Template not found");
    this.name = "NotFoundError";
  }
}

export interface TemplateRow {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export async function listTemplates(): Promise<TemplateRow[]> {
  const { rows } = await query<TemplateRow>(
    `SELECT id, name, subject, body, created_at, updated_at FROM notification_templates ORDER BY created_at DESC`
  );
  return rows;
}

export async function getTemplate(id: string): Promise<TemplateRow> {
  const { rows } = await query<TemplateRow>(
    `SELECT id, name, subject, body, created_at, updated_at FROM notification_templates WHERE id = $1`,
    [id]
  );
  if (!rows[0]) throw new NotFoundError();
  return rows[0];
}

export async function createTemplate(name: string, subject: string, body: string, actorId: string): Promise<{ id: string }> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO notification_templates (name, subject, body, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
    [name, subject, body, actorId]
  );
  await logAudit(actorId, "notification_template_created", "notification_template", rows[0].id, { name });
  return { id: rows[0].id };
}

export async function updateTemplate(
  id: string,
  updates: { name?: string; subject?: string; body?: string },
  actorId: string
): Promise<void> {
  const sets: string[] = [];
  const vals: unknown[] = [id];
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    vals.push(value);
    sets.push(`${key} = $${vals.length}`);
  }
  if (sets.length === 0) return;
  sets.push(`updated_at = now()`);

  const { rowCount } = await query(`UPDATE notification_templates SET ${sets.join(", ")} WHERE id = $1`, vals);
  if (!rowCount) throw new NotFoundError();
  await logAudit(actorId, "notification_template_updated", "notification_template", id, updates);
}

export async function deleteTemplate(id: string, actorId: string): Promise<void> {
  const { rowCount } = await query(`DELETE FROM notification_templates WHERE id = $1`, [id]);
  if (!rowCount) throw new NotFoundError();
  await logAudit(actorId, "notification_template_deleted", "notification_template", id);
}
