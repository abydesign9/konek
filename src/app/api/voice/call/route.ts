import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { InsufficientBalanceForCallError, placeCall } from "@/lib/voice/voiceService";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { toNumber, durationSeconds } = body ?? {};
  if (typeof toNumber !== "string" || toNumber.length < 6) {
    return NextResponse.json({ error: "a valid toNumber is required" }, { status: 400 });
  }
  if (!Number.isInteger(durationSeconds) || durationSeconds <= 0) {
    return NextResponse.json({ error: "durationSeconds must be a positive integer" }, { status: 400 });
  }

  try {
    const result = await placeCall(userId, toNumber, durationSeconds);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof InsufficientBalanceForCallError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    throw err;
  }
}
