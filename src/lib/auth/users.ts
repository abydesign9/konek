import crypto from "node:crypto";
import { query } from "@/lib/db";

// A referral identifier in a link can be a username (the default — links look
// like /signup?ref=ada) or the legacy referral_code. Match either, so people can
// share a readable link without setting anything up. Username match is
// case-insensitive; referral_code is upper-cased.
export async function resolveReferrerId(ref: string | null | undefined): Promise<string | null> {
  if (!ref) return null;
  const trimmed = ref.trim();
  if (!trimmed) return null;
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM users WHERE lower(username) = lower($1) OR referral_code = upper($1) LIMIT 1`,
    [trimmed]
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

  // Phase 2 gamification tracks referrals in their own tables, mirroring
  // the Phase 1 users.referral_code/referred_by fields above.
  await query(`INSERT INTO referral_codes (code, user_id) VALUES ($1, $2)`, [newReferralCode, id]);
  if (referredBy) {
    await query(
      `INSERT INTO referral_conversions (referral_code, referred_user_id) VALUES ($1, $2)`,
      [referralCode!.toUpperCase(), id]
    );
  }

  return created.rows[0].id;
}
