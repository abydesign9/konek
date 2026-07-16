import { NextRequest, NextResponse } from "next/server";
import { isValidPhone, verifyOtp } from "@/lib/auth/otp";
import { findOrCreateUserByPhone } from "@/lib/auth/users";
import { createSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phone = body?.phone;
  const code = body?.code;
  const referralCode = typeof body?.referralCode === "string" ? body.referralCode : null;

  if (typeof phone !== "string" || !isValidPhone(phone)) {
    return NextResponse.json({ error: "invalid phone" }, { status: 400 });
  }
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "invalid code" }, { status: 400 });
  }

  const valid = await verifyOtp(phone, code);
  if (!valid) {
    return NextResponse.json({ error: "invalid or expired code" }, { status: 401 });
  }

  const userId = await findOrCreateUserByPhone(phone, referralCode);

  // A closed account's sessions are already revoked (see closeAccount()),
  // but that only matters once one exists — this is what actually stops
  // a closed or suspended account from getting back in via a fresh login.
  const { rows: statusRows } = await query<{ status: string }>(`SELECT status FROM users WHERE id = $1`, [userId]);
  if (statusRows[0]?.status === "closed" || statusRows[0]?.status === "suspended") {
    return NextResponse.json({ error: "This account is not active. Contact support for help." }, { status: 403 });
  }

  await createSession(userId);
  await logAudit(userId, "login", "user", userId, { phone });

  return NextResponse.json({ ok: true });
}
