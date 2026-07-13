import { query } from "@/lib/db";

export async function findOrCreateUserByPhone(phone: string) {
  const existing = await query<{ id: string }>(`SELECT id FROM users WHERE phone = $1`, [phone]);
  if (existing.rows[0]) return existing.rows[0].id;

  const created = await query<{ id: string }>(
    `INSERT INTO users (phone) VALUES ($1) RETURNING id`,
    [phone]
  );
  return created.rows[0].id;
}
