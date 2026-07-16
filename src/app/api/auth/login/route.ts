import { NextRequest, NextResponse } from "next/server";
import { verifyPasswordLogin, InvalidCredentialsError } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { checkRateLimit, clientIp, RateLimitExceededError } from "@/lib/rateLimit";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = body?.email;
  const password = body?.password;

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  try {
    checkRateLimit(`login:email:${email.toLowerCase()}`, 8, 15 * 60 * 1000);
    checkRateLimit(`login:ip:${clientIp(req)}`, 30, 15 * 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many attempts — try again shortly" }, { status: 429 });
    }
    throw err;
  }

  try {
    const { userId } = await verifyPasswordLogin(email, password);

    // Same status guard as the OTP path — a closed/suspended account
    // never gets a fresh session, regardless of which door it comes in.
    const { rows: statusRows } = await query<{ status: string }>(`SELECT status FROM users WHERE id = $1`, [userId]);
    if (statusRows[0]?.status === "closed" || statusRows[0]?.status === "suspended") {
      return NextResponse.json({ error: "This account is not active. Contact support for help." }, { status: 403 });
    }

    await createSession(userId);
    await logAudit(userId, "login", "user", userId, { method: "email_password" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof InvalidCredentialsError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
