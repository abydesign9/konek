import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { verifyEmailOtp } from "@/lib/auth/emailOtp";
import {
  changePin,
  hasPinSet,
  IncorrectPinError,
  InvalidPinFormatError,
  PinAlreadySetError,
  PinNotSetError,
  setPin,
} from "@/lib/auth/pin";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  return NextResponse.json({ hasPin: await hasPinSet(userId) });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const pin = body?.pin;
  if (typeof pin !== "string") {
    return NextResponse.json({ error: "pin is required" }, { status: 400 });
  }

  try {
    await setPin(userId, pin);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof InvalidPinFormatError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof PinAlreadySetError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}

// Self-service change — requires the current PIN. Distinct from POST
// above (first-time set only) and from the admin reset flow (clears it
// outright, no current-PIN check, for a customer who's locked out).
export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const currentPin = body?.currentPin;
  const newPin = body?.newPin;
  const otp = body?.otp;
  if (typeof currentPin !== "string" || typeof newPin !== "string") {
    return NextResponse.json({ error: "currentPin and newPin are required" }, { status: 400 });
  }
  if (typeof otp !== "string" || otp.length < 4) {
    return NextResponse.json({ error: "An email verification code is required", code: "otp_required" }, { status: 400 });
  }

  const { rows } = await query<{ email: string | null }>(`SELECT email FROM users WHERE id = $1`, [userId]);
  const email = rows[0]?.email;
  if (!email || !(await verifyEmailOtp(email, otp, "change_pin"))) {
    return NextResponse.json({ error: "That code is invalid or expired", code: "otp_invalid" }, { status: 401 });
  }

  try {
    await changePin(userId, currentPin, newPin);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof InvalidPinFormatError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof PinNotSetError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof IncorrectPinError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
