import { NextRequest, NextResponse } from "next/server";
import { isValidPhone, requestOtp } from "@/lib/auth/otp";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phone = body?.phone;

  if (typeof phone !== "string" || !isValidPhone(phone)) {
    return NextResponse.json(
      { error: "phone must be in E.164 format, e.g. +2348012345678" },
      { status: 400 }
    );
  }

  await requestOtp(phone);
  return NextResponse.json({ ok: true });
}
