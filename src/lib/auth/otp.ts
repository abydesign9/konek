import crypto from "node:crypto";
import { query } from "@/lib/db";
import { smsSender } from "@/lib/sms";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function isValidPhone(phone: string) {
  return /^\+\d{7,15}$/.test(phone);
}

export async function requestOtp(
  phone: string,
  purpose: "login" | "signup" = "login"
): Promise<{ code: string }> {
  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  const { vendorRef } = await smsSender.sendOtp(phone, code);

  await query(
    `INSERT INTO otp_codes (phone, code_hash, purpose, vendor_ref, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [phone, codeHash, purpose, vendorRef, expiresAt]
  );

  return { code };
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const { rows } = await query<{ id: string; code_hash: string; attempt_count: number }>(
    `SELECT id, code_hash, attempt_count FROM otp_codes
     WHERE phone = $1 AND consumed_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [phone]
  );
  const otp = rows[0];
  if (!otp || otp.attempt_count >= MAX_ATTEMPTS) return false;

  const match = otp.code_hash === hashCode(code);

  if (!match) {
    await query(`UPDATE otp_codes SET attempt_count = attempt_count + 1 WHERE id = $1`, [otp.id]);
    return false;
  }

  await query(`UPDATE otp_codes SET consumed_at = now() WHERE id = $1`, [otp.id]);
  return true;
}
