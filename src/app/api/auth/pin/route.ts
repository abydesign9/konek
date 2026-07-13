import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { hasPinSet, InvalidPinFormatError, PinAlreadySetError, setPin } from "@/lib/auth/pin";

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
