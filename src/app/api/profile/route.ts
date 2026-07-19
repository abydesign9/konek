import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { encryptPii, decryptPii, type EncryptedEnvelope } from "@/lib/crypto/pii";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function profileAad(userId: string): string {
  return `profile:${userId}`;
}

// Decrypt an envelope column, tolerating null without throwing.
function safeDecrypt(env: unknown, userId: string): string | null {
  if (!env || typeof env !== "object") return null;
  try {
    return decryptPii(env as EncryptedEnvelope, profileAad(userId));
  } catch {
    return null;
  }
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

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
    created_at: string;
  }>(
    `SELECT phone, full_name, email, username, avatar_url, date_of_birth_encrypted,
            address_encrypted, country_code, kyc_tier, kyc_status, created_at
     FROM users WHERE id = $1`,
    [userId]
  );
  const u = rows[0];
  if (!u) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { date_of_birth_encrypted, address_encrypted, ...rest } = u;
  return NextResponse.json({
    ...rest,
    date_of_birth: safeDecrypt(date_of_birth_encrypted, userId),
    address: safeDecrypt(address_encrypted, userId),
  });
}

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { fullName, email, username, avatarUrl, dob, address } = body ?? {};

  if (fullName !== undefined && (typeof fullName !== "string" || !fullName.trim())) {
    return NextResponse.json({ error: "fullName must be a non-empty string" }, { status: 400 });
  }
  if (email !== undefined && email !== null && (typeof email !== "string" || !EMAIL_RE.test(email))) {
    return NextResponse.json({ error: "email must be a valid address" }, { status: 400 });
  }
  if (username !== undefined && username !== null && (typeof username !== "string" || !USERNAME_RE.test(username))) {
    return NextResponse.json({ error: "Username must be 3–20 letters, numbers or underscores" }, { status: 400 });
  }
  if (avatarUrl !== undefined && avatarUrl !== null && typeof avatarUrl !== "string") {
    return NextResponse.json({ error: "avatarUrl must be a string" }, { status: 400 });
  }
  if (dob !== undefined && dob !== null && dob !== "") {
    if (typeof dob !== "string" || Number.isNaN(Date.parse(dob)) || new Date(dob) > new Date()) {
      return NextResponse.json({ error: "Enter a valid date of birth" }, { status: 400 });
    }
  }
  if (address !== undefined && address !== null && (typeof address !== "string" || address.length > 500)) {
    return NextResponse.json({ error: "address must be under 500 characters" }, { status: 400 });
  }

  const aad = profileAad(userId);
  const dobEnc = typeof dob === "string" && dob !== "" ? JSON.stringify(encryptPii(dob, aad)) : null;
  const addrEnc = typeof address === "string" && address !== "" ? JSON.stringify(encryptPii(address, aad)) : null;

  try {
    await query(
      `UPDATE users SET
         full_name  = COALESCE($2, full_name),
         email      = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE email END,
         username   = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE username END,
         avatar_url = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE avatar_url END,
         date_of_birth_encrypted = CASE WHEN $6::jsonb IS NOT NULL THEN $6::jsonb ELSE date_of_birth_encrypted END,
         address_encrypted       = CASE WHEN $7::jsonb IS NOT NULL THEN $7::jsonb ELSE address_encrypted END,
         updated_at = now()
       WHERE id = $1`,
      [userId, fullName ?? null, email ?? null, username ?? null, avatarUrl ?? null, dobEnc, addrEnc]
    );
  } catch (err) {
    // users.email and username are UNIQUE — surface the real cause.
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23505") {
      const detail = String((err as { detail?: string }).detail ?? "");
      const field = detail.includes("username") ? "username" : "email";
      return NextResponse.json({ error: `That ${field} is already in use` }, { status: 409 });
    }
    throw err;
  }

  await logAudit(userId, "profile_updated", "user", userId, { fields: Object.keys(body ?? {}) });
  return NextResponse.json({ ok: true });
}
