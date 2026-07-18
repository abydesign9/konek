import { NextRequest, NextResponse } from "next/server";
import { isDemoOtpPhone, isValidPhone, requestOtp } from "@/lib/auth/otp";
import { checkRateLimit, clientIp, RateLimitExceededError } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phone = body?.phone;

  if (typeof phone !== "string" || !isValidPhone(phone)) {
    return NextResponse.json(
      { error: "phone must be in E.164 format, e.g. +2348012345678" },
      { status: 400 }
    );
  }

  try {
    await checkRateLimit(`otp_request:phone:${phone}`, 5, 10 * 60 * 1000); // 5 per 10 min per number
    await checkRateLimit(`otp_request:ip:${clientIp(req)}`, 20, 10 * 60 * 1000); // 20 per 10 min per IP
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many requests — try again shortly" }, { status: 429 });
    }
    throw err;
  }

  const { code } = await requestOtp(phone);
  return NextResponse.json(isDemoOtpPhone(phone) ? { ok: true, demoOtp: code } : { ok: true });
}
