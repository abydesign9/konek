import { NextRequest, NextResponse } from "next/server";
import { signUpWithPassword, InvalidEmailError, WeakPasswordError, EmailAlreadyInUseError } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { checkRateLimit, clientIp, RateLimitExceededError } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const fullName = body?.fullName;
  const email = body?.email;
  const password = body?.password;
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

  try {
    checkRateLimit(`signup:ip:${clientIp(req)}`, 10, 15 * 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many attempts — try again shortly" }, { status: 429 });
    }
    throw err;
  }

  try {
    const { userId } = await signUpWithPassword(fullName, email, password, referralCode);
    await createSession(userId);
    await logAudit(userId, "signup", "user", userId, { method: "email_password" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof InvalidEmailError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof WeakPasswordError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof EmailAlreadyInUseError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
}
