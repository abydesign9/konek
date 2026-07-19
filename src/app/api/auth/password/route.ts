import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { verifyEmailOtp } from "@/lib/auth/emailOtp";
import { changePassword, InvalidCredentialsError, WeakPasswordError } from "@/lib/auth/password";

// Self-service password change. Two-factor: the current password AND an email
// one-time code (purpose change_password) are both required.
export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const currentPassword = body?.currentPassword;
  const newPassword = body?.newPassword;
  const otp = body?.otp;
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return NextResponse.json({ error: "currentPassword and newPassword are required" }, { status: 400 });
  }
  if (typeof otp !== "string" || otp.length < 4) {
    return NextResponse.json({ error: "An email verification code is required", code: "otp_required" }, { status: 400 });
  }

  const { rows } = await query<{ email: string | null }>(`SELECT email FROM users WHERE id = $1`, [userId]);
  const email = rows[0]?.email;
  if (!email || !(await verifyEmailOtp(email, otp, "change_password"))) {
    return NextResponse.json({ error: "That code is invalid or expired", code: "otp_invalid" }, { status: 401 });
  }

  try {
    await changePassword(userId, currentPassword, newPassword);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof WeakPasswordError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof InvalidCredentialsError) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }
    throw err;
  }
}
