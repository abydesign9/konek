import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { setCardControls, type CardControls } from "@/lib/cards/cardService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const controls: CardControls = {};
  if ("singleTxnLimitMinor" in body) {
    const v = body.singleTxnLimitMinor;
    if (v !== null && (!Number.isInteger(v) || v <= 0)) {
      return NextResponse.json({ error: "singleTxnLimitMinor must be a positive integer or null" }, { status: 400 });
    }
    controls.singleTxnLimitMinor = v;
  }
  if ("monthlyLimitMinor" in body) {
    const v = body.monthlyLimitMinor;
    if (v !== null && (!Number.isInteger(v) || v <= 0)) {
      return NextResponse.json({ error: "monthlyLimitMinor must be a positive integer or null" }, { status: 400 });
    }
    controls.monthlyLimitMinor = v;
  }
  if ("merchantLock" in body) {
    const v = body.merchantLock;
    if (v !== null && typeof v !== "string") {
      return NextResponse.json({ error: "merchantLock must be a string or null" }, { status: 400 });
    }
    controls.merchantLock = v;
  }

  await setCardControls(params.id, userId, controls);
  return NextResponse.json({ ok: true });
}
