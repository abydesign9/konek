import crypto from "node:crypto";
import { query } from "@/lib/db";
import { emailSender } from "@/lib/email";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}
function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// Generates + emails a one-time code, stored hashed. Returns the code so the
// request route can surface it as a demo value when real email delivery isn't
// configured yet (RESEND_API_KEY unset).
export async function requestEmailOtp(
  email: string,
  purpose: "signup" | "change_pin" | "change_password" = "signup"
): Promise<{ code: string }> {
  const normalized = email.trim().toLowerCase();
  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  const { vendorRef } = await emailSender.sendOtp(normalized, code);
  await query(
    `INSERT INTO otp_codes (email, code_hash, purpose, vendor_ref, expires_at) VALUES ($1, $2, $3, $4, $5)`,
    [normalized, codeHash, purpose, vendorRef, expiresAt]
  );
  return { code };
}

export async function verifyEmailOtp(email: string, code: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const { rows } = await query<{ id: string; code_hash: string; attempt_count: number }>(
    `SELECT id, code_hash, attempt_count FROM otp_codes
     WHERE email = $1 AND consumed_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [normalized]
  );
  const otp = rows[0];
  if (!otp || otp.attempt_count >= MAX_ATTEMPTS) return false;

  if (otp.code_hash !== hashCode(code)) {
    await query(`UPDATE otp_codes SET attempt_count = attempt_count + 1 WHERE id = $1`, [otp.id]);
    return false;
  }
  await query(`UPDATE otp_codes SET consumed_at = now() WHERE id = $1`, [otp.id]);
  return true;
}
