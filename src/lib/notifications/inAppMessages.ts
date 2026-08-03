import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export class NotFoundError extends Error {
  constructor() {
    super("In-app message not found");
    this.name = "NotFoundError";
  }
}

export class InvalidUrlError extends Error {
  constructor() {
    super("url must start with http:// or https://");
    this.name = "InvalidUrlError";
  }
}

// This renders as a raw <Link href={m.url}> on every logged-in customer's
// home screen — a javascript: URI here would execute in the authenticated
// app origin the moment a user taps the card. Only allow real web links.
function assertSafeUrl(url: string | null | undefined): void {
  if (url && !/^https?:\/\//i.test(url)) throw new InvalidUrlError();
}

export type InAppMessageType = "image" | "video" | "survey";
export type InAppMessageDimension = "small" | "medium" | "large";

export interface InAppMessageRow {
  id: string;
  title: string;
  type: InAppMessageType;
  message: string;
  url: string | null;
  dimension: InAppMessageDimension;
  display_duration_seconds: number;
  active: boolean;
  closable: boolean;
  status: string; // draft|active|inactive
  created_at: string;
  updated_at: string;
}

export async function listAllInAppMessages(): Promise<InAppMessageRow[]> {
  const { rows } = await query<InAppMessageRow>(`SELECT * FROM in_app_messages ORDER BY created_at DESC`);
  return rows;
}

// Customer-facing: only what's actually live right now.
export async function listActiveInAppMessages(): Promise<InAppMessageRow[]> {
  const { rows } = await query<InAppMessageRow>(
    `SELECT * FROM in_app_messages WHERE status = 'active' AND active = true ORDER BY created_at DESC`
  );
  return rows;
}

export interface InAppMessageInput {
  title: string;
  type: InAppMessageType;
  message: string;
  url?: string;
  dimension: InAppMessageDimension;
  displayDurationSeconds: number;
  active: boolean;
  closable: boolean;
  status: string;
}

export async function createInAppMessage(input: InAppMessageInput, actorId: string): Promise<{ id: string }> {
  assertSafeUrl(input.url);
  const { rows } = await query<{ id: string }>(
    `INSERT INTO in_app_messages (title, type, message, url, dimension, display_duration_seconds, active, closable, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [
      input.title,
      input.type,
      input.message,
      input.url ?? null,
      input.dimension,
      input.displayDurationSeconds,
      input.active,
      input.closable,
      input.status,
      actorId,
    ]
  );
  await logAudit(actorId, "in_app_message_created", "in_app_message", rows[0].id, { title: input.title });
  return { id: rows[0].id };
}

export async function updateInAppMessage(
  id: string,
  updates: Partial<InAppMessageInput>,
  actorId: string
): Promise<void> {
  if ("url" in updates) assertSafeUrl(updates.url);
  const columnMap: Record<string, string> = {
    title: "title",
    type: "type",
    message: "message",
    url: "url",
    dimension: "dimension",
    displayDurationSeconds: "display_duration_seconds",
    active: "active",
    closable: "closable",
    status: "status",
  };
  const sets: string[] = [];
  const vals: unknown[] = [id];
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || !columnMap[key]) continue;
    vals.push(value);
    sets.push(`${columnMap[key]} = $${vals.length}`);
  }
  if (sets.length === 0) return;
  sets.push(`updated_at = now()`);

  const { rowCount } = await query(`UPDATE in_app_messages SET ${sets.join(", ")} WHERE id = $1`, vals);
  if (!rowCount) throw new NotFoundError();
  await logAudit(actorId, "in_app_message_updated", "in_app_message", id, updates);
}

export async function deleteInAppMessage(id: string, actorId: string): Promise<void> {
  const { rowCount } = await query(`DELETE FROM in_app_messages WHERE id = $1`, [id]);
  if (!rowCount) throw new NotFoundError();
  await logAudit(actorId, "in_app_message_deleted", "in_app_message", id);
}
