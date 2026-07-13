import { NextRequest, NextResponse } from "next/server";
import { isValidPhone, verifyOtp } from "@/lib/auth/otp";
import { findOrCreateUserByPhone } from "@/lib/auth/users";
import { createSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phone = body?.phone;
  const code = body?.code;

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

  const userId = await findOrCreateUserByPhone(phone);
  await createSession(userId);

  return NextResponse.json({ ok: true });
}
