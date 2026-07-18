import { NextRequest, NextResponse } from "next/server";
import { signUpWithPassword, InvalidEmailError, WeakPasswordError, EmailAlreadyInUseError } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { verifyEmailOtp } from "@/lib/auth/emailOtp";
import { logAudit } from "@/lib/audit";
import { checkRateLimit, clientIp, RateLimitExceededError } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const fullName = body?.fullName;
  const email = body?.email;
  const password = body?.password;
  const code = body?.code;
  const referralCode = typeof body?.referralCode === "string" ? body.referralCode : null;

  if (typeof fullName !== "string" || !fullName.trim()) {
    return NextResponse.json({ error: "fullName is required" }, { status: 400 });
  }
  if (typeof email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }
  if (typeof password !== "string") {
    return NextResponse.json({ error: "password is required" }, { status: 400 });
  }
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "A valid 6-digit email code is required" }, { status: 400 });
  }

  try {
    await checkRateLimit(`signup:ip:${clientIp(req)}`, 10, 15 * 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many attempts — try again shortly" }, { status: 429 });
    }
    throw err;
  }

  // Email must be verified with the one-time code before an account is created.
  const emailVerified = await verifyEmailOtp(email, code);
  if (!emailVerified) {
    return NextResponse.json({ error: "That code is incorrect or has expired" }, { status: 401 });
  }

  try {
    const { userId } = await signUpWithPassword(fullName, email, password, referralCode);
    await createSession(userId, { userAgent: req.headers.get("user-agent"), ip: clientIp(req) });
    await logAudit(userId, "signup", "user", userId, { method: "email_password" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof InvalidEmailError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof WeakPasswordError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof EmailAlreadyInUseError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
}
