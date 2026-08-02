import { query } from "@/lib/db";
import { decryptPii, type EncryptedEnvelope } from "@/lib/crypto/pii";

// Shape consumed by the profile UI. Mirrors GET /api/profile so the page can be
// server-rendered with data instead of a client fetch waterfall.
export interface ProfileData {
  phone: string | null;
  full_name: string | null;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  address: string | null;
  country_code: string;
  kyc_tier: number;
  kyc_status: string;
}

function profileAad(userId: string): string {
  return `profile:${userId}`;
}

function safeDecrypt(env: unknown, userId: string): string | null {
  if (!env || typeof env !== "object") return null;
  try {
    return decryptPii(env as EncryptedEnvelope, profileAad(userId));
  } catch {
    return null;
  }
}

// Load a user's profile server-side (single query + decrypt). Returns null if
// the user row is missing.
export async function getProfile(userId: string): Promise<ProfileData | null> {
  const { rows } = await query<{
    phone: string | null;
    full_name: string | null;
    email: string | null;
    username: string | null;
    avatar_url: string | null;
    date_of_birth_encrypted: unknown;
    address_encrypted: unknown;
    country_code: string;
    kyc_tier: number;
    kyc_status: string;
  }>(
    `SELECT phone, full_name, email, username, avatar_url, date_of_birth_encrypted,
            address_encrypted, country_code, kyc_tier, kyc_status
     FROM users WHERE id = $1`,
    [userId]
  );
  const u = rows[0];
  if (!u) return null;
  const { date_of_birth_encrypted, address_encrypted, ...rest } = u;
  return {
    ...rest,
    date_of_birth: safeDecrypt(date_of_birth_encrypted, userId),
    address: safeDecrypt(address_encrypted, userId),
  };
}
