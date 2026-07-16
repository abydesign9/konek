import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { resolveReferrerId } from "@/lib/auth/users";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export class InvalidEmailError extends Error {
  constructor() {
    super("Enter a valid email address");
    this.name = "InvalidEmailError";
  }
}
export class WeakPasswordError extends Error {
  constructor() {
    super(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    this.name = "WeakPasswordError";
  }
}
export class EmailAlreadyInUseError extends Error {
  constructor() {
    super("An account with that email already exists");
    this.name = "EmailAlreadyInUseError";
  }
}
export class InvalidCredentialsError extends Error {
  constructor() {
    super("Incorrect email or password");
    this.name = "InvalidCredentialsError";
  }
}

// Signup path #2 (alongside phone+OTP, which findOrCreateUserByPhone in
// users.ts still serves — kept for a later "add your phone" step, not
// deleted). This is the primary one now: full name + email + password.
// phone stays NULL until that later step exists; nothing on this path
// requires it.
export async function signUpWithPassword(
  fullName: string,
  email: string,
  password: string,
  referralCode?: string | null
): Promise<{ userId: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalizedEmail)) throw new InvalidEmailError();
  if (password.length < MIN_PASSWORD_LENGTH) throw new WeakPasswordError();

  const { rows: existing } = await query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [normalizedEmail]);
  if (existing[0]) throw new EmailAlreadyInUseError();

  const passwordHash = await bcrypt.hash(password, 10);
  const referredBy = await resolveReferrerId(referralCode);
  const id = crypto.randomUUID();
  const newReferralCode = id.replace(/-/g, "").slice(0, 8).toUpperCase();

  await query(
    `INSERT INTO users (id, email, full_name, password_hash, referral_code, referred_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, normalizedEmail, fullName.trim(), passwordHash, newReferralCode, referredBy]
  );

  await query(`INSERT INTO referral_codes (code, user_id) VALUES ($1, $2)`, [newReferralCode, id]);
  if (referredBy && referralCode) {
    await query(
      `INSERT INTO referral_conversions (referral_code, referred_user_id) VALUES ($1, $2)`,
      [referralCode.toUpperCase(), id]
    );
  }

  return { userId: id };
}

export async function verifyPasswordLogin(email: string, password: string): Promise<{ userId: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const { rows } = await query<{ id: string; password_hash: string | null }>(
    `SELECT id, password_hash FROM users WHERE email = $1`,
    [normalizedEmail]
  );
  const user = rows[0];
  // Same error for "no such email" and "wrong password" — don't leak
  // which one it was.
  if (!user || !user.password_hash) throw new InvalidCredentialsError();

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new InvalidCredentialsError();

  return { userId: user.id };
}
