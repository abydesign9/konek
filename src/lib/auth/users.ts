import crypto from "node:crypto";
import { query } from "@/lib/db";

export async function resolveReferrerId(referralCode: string | null | undefined): Promise<string | null> {
  if (!referralCode) return null;
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM users WHERE referral_code = $1`,
    [referralCode.toUpperCase()]
  );
  return rows[0]?.id ?? null;
}

export async function findOrCreateUserByPhone(
  phone: string,
  referralCode?: string | null
): Promise<string> {
  const existing = await query<{ id: string }>(`SELECT id FROM users WHERE phone = $1`, [phone]);
  if (existing.rows[0]) return existing.rows[0].id;

  const referredBy = await resolveReferrerId(referralCode);
  const id = crypto.randomUUID();
  const newReferralCode = id.replace(/-/g, "").slice(0, 8).toUpperCase();

  const created = await query<{ id: string }>(
    `INSERT INTO users (id, phone, referral_code, referred_by) VALUES ($1, $2, $3, $4) RETURNING id`,
    [id, phone, newReferralCode, referredBy]
  );
  return created.rows[0].id;
}
