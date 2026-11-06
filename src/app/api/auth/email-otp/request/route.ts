import { NextRequest, NextResponse } from "next/server";
import { isValidEmail, requestEmailOtp } from "@/lib/auth/emailOtp";
import { ProviderHttpError, ProviderNetworkError, ProviderTimeoutError, CircuitOpenError } from "@/lib/http/resilientHttp";
import { checkRateLimit, clientIp, RateLimitExceededError } from "@/lib/rateLimit";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";

// Sends an email verification code. Two modes:
//   - signup (default, unauthenticated): to the supplied email, enumeration-safe.
//   - change_pin / change_password (authenticated): to the logged-in user's own
//     email, ignoring any client-supplied address.
// When RESEND_API_KEY isn't set, the code is returned so the flow works in dev.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const purpose = body?.purpose === "change_pin" || body?.purpose === "change_password" ? body.purpose : "signup";

  async function rateLimit(key: string) {
    await checkRateLimit(`email_otp:${key}`, 5, 10 * 60 * 1000);
    await checkRateLimit(`email_otp:ip:${clientIp(req)}`, 20, 10 * 60 * 1000);
  }

  try {
    if (purpose === "signup") {
      const email = body?.email;
      if (typeof email !== "string" || !isValidEmail(email)) {
        return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
      }
      const normalized = email.trim().toLowerCase();
      await rateLimit(normalized);

      // Don't reveal whether the email already has an account (enumeration), but
      // do avoid emailing an OTP for one — signup would fail anyway.
      const { rows } = await query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [normalized]);
      if (rows[0]) return NextResponse.json({ ok: true });

      await requestEmailOtp(normalized, "signup");
      return NextResponse.json({ ok: true });
    }

    // Sensitive change: always send to the account's own verified email.
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    const { rows } = await query<{ email: string | null }>(`SELECT email FROM users WHERE id = $1`, [userId]);
    const email = rows[0]?.email;
    if (!email) return NextResponse.json({ error: "No email on file" }, { status: 400 });

    await rateLimit(`${purpose}:${userId}`);
    await requestEmailOtp(email, purpose);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many requests — try again shortly" }, { status: 429 });
    }
    // Email provider failed (misconfigured sender domain, bad key, provider
    // outage, etc). Log the real cause for debugging but don't leak provider
    // internals to the client — just surface a clear, actionable message.
    if (
      err instanceof ProviderHttpError ||
      err instanceof ProviderNetworkError ||
      err instanceof ProviderTimeoutError ||
      err instanceof CircuitOpenError
    ) {
      console.error("[email-otp/request] email delivery failed:", err);
      return NextResponse.json(
        { error: "We couldn't send the email right now. Please try again in a moment." },
        { status: 502 }
      );
    }
    if (err instanceof Error && err.message === "Missing DATABASE_URL env var") {
      console.error("[email-otp/request] database not configured:", err);
      return NextResponse.json({ error: "Service is temporarily unavailable. Please try again shortly." }, { status: 503 });
    }
    console.error("[email-otp/request] unexpected error:", err);
    return NextResponse.json({ error: "Couldn't send the code — try again" }, { status: 500 });
  }
}
