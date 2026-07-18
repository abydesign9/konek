import { NextRequest, NextResponse } from "next/server";
import { isValidEmail, requestEmailOtp } from "@/lib/auth/emailOtp";
import { isEmailDeliveryConfigured } from "@/lib/email";
import { checkRateLimit, clientIp, RateLimitExceededError } from "@/lib/rateLimit";
import { query } from "@/lib/db";

// Sends an email verification code for signup. When RESEND_API_KEY isn't set,
// the code is returned in the response so the flow can be exercised in dev.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = body?.email;
  if (typeof email !== "string" || !isValidEmail(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  const normalized = email.trim().toLowerCase();

  try {
    await checkRateLimit(`email_otp:${normalized}`, 5, 10 * 60 * 1000);
    await checkRateLimit(`email_otp:ip:${clientIp(req)}`, 20, 10 * 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many requests — try again shortly" }, { status: 429 });
    }
    throw err;
  }

  // Don't reveal whether the email already has an account (enumeration), but do
  // avoid emailing an OTP for one — signup would fail anyway.
  const { rows } = await query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [normalized]);
  if (rows[0]) {
    return NextResponse.json({ ok: true }); // silently succeed; no code sent
  }

  const { code } = await requestEmailOtp(normalized, "signup");
  return NextResponse.json(isEmailDeliveryConfigured() ? { ok: true } : { ok: true, demoOtp: code });
}
