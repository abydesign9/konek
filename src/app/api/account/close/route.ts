import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, clearSession } from "@/lib/auth/session";
import { closeAccount, OutstandingBalanceError } from "@/lib/auth/closeAccount";
import { IncorrectPinError, InvalidPinFormatError, PinNotSetError } from "@/lib/auth/pin";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const pin = body?.pin;
  if (typeof pin !== "string") {
    return NextResponse.json({ error: "pin is required" }, { status: 400 });
  }

  try {
    await closeAccount(userId, pin);
  } catch (err) {
    if (err instanceof InvalidPinFormatError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof PinNotSetError) return NextResponse.json({ error: err.message }, { status: 409 });
    if (err instanceof IncorrectPinError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof OutstandingBalanceError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }

  // closeAccount() already deleted every session row (including this
  // request's), but the browser still holds the cookie — clear it too so
  // the client doesn't keep sending a token that's now meaningless.
  await clearSession();
  return NextResponse.json({ ok: true });
}
