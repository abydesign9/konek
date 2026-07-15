import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export interface FaqRow {
  id: string;
  category: string;
  question: string;
  answer: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export async function listPublishedFaqs(): Promise<FaqRow[]> {
  const { rows } = await query<FaqRow>(
    `SELECT id, category, question, answer, published, created_at, updated_at
     FROM faq_articles WHERE published = true ORDER BY category, created_at`
  );
  return rows;
}

export async function listAllFaqs(): Promise<FaqRow[]> {
  const { rows } = await query<FaqRow>(
    `SELECT id, category, question, answer, published, created_at, updated_at
     FROM faq_articles ORDER BY category, created_at`
  );
  return rows;
}

export async function createFaq(
  category: string,
  question: string,
  answer: string,
  actorId: string
): Promise<{ id: string }> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO faq_articles (category, question, answer) VALUES ($1, $2, $3) RETURNING id`,
    [category, question, answer]
  );
  await logAudit(actorId, "faq_created", "faq_article", rows[0].id, { question });
  return { id: rows[0].id };
}

export class NotFoundError extends Error {
  constructor() {
    super("FAQ not found");
    this.name = "NotFoundError";
  }
}

export async function updateFaq(
  id: string,
  updates: { category?: string; question?: string; answer?: string; published?: boolean },
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

  const { rowCount } = await query(`UPDATE faq_articles SET ${sets.join(", ")} WHERE id = $1`, vals);
  if (!rowCount) throw new NotFoundError();
  await logAudit(actorId, "faq_updated", "faq_article", id, updates);
}

export async function deleteFaq(id: string, actorId: string): Promise<void> {
  const { rowCount } = await query(`DELETE FROM faq_articles WHERE id = $1`, [id]);
  if (!rowCount) throw new NotFoundError();
  await logAudit(actorId, "faq_deleted", "faq_article", id);
}
