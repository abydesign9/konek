import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { rows } = await query<{
    phone: string;
    full_name: string | null;
    email: string | null;
    country_code: string;
    kyc_tier: number;
    kyc_status: string;
    created_at: string;
  }>(
    `SELECT phone, full_name, email, country_code, kyc_tier, kyc_status, created_at FROM users WHERE id = $1`,
    [userId]
  );
  if (!rows[0]) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const fullName = body?.fullName;
  const email = body?.email;

  if (fullName !== undefined && (typeof fullName !== "string" || !fullName.trim())) {
    return NextResponse.json({ error: "fullName must be a non-empty string" }, { status: 400 });
  }
  if (email !== undefined && email !== null && (typeof email !== "string" || !EMAIL_RE.test(email))) {
    return NextResponse.json({ error: "email must be a valid address" }, { status: 400 });
  }

  try {
    await query(
      `UPDATE users SET
         full_name = COALESCE($2, full_name),
         email = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE email END,
         updated_at = now()
       WHERE id = $1`,
      [userId, fullName ?? null, email ?? null]
    );
  } catch (err) {
    // users.email has a UNIQUE constraint — surface the real cause instead
    // of a generic 500.
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "That email is already in use" }, { status: 409 });
    }
    throw err;
  }

  await logAudit(userId, "profile_updated", "user", userId, { fullNameChanged: fullName !== undefined, emailChanged: email !== undefined });
  return NextResponse.json({ ok: true });
}
