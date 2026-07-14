import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { setCardFrozen } from "@/lib/cards/cardService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const frozen = body?.frozen;
  if (typeof frozen !== "boolean") {
    return NextResponse.json({ error: "frozen (boolean) is required" }, { status: 400 });
  }

  await setCardFrozen(params.id, userId, frozen);
  return NextResponse.json({ ok: true });
}
