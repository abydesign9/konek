import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { convertUsdToNgn, InsufficientUsdBalanceError } from "@/lib/dollarAccount/convertUsdToNgn";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const usdMinor = body?.usdMinor;
  const idempotencyKey = body?.idempotencyKey;

  if (!Number.isInteger(usdMinor) || usdMinor <= 0) {
    return NextResponse.json({ error: "usdMinor must be a positive integer" }, { status: 400 });
  }
  if (typeof idempotencyKey !== "string" || idempotencyKey.length < 8) {
    return NextResponse.json({ error: "idempotencyKey is required" }, { status: 400 });
  }

  try {
    const result = await convertUsdToNgn(userId, usdMinor, idempotencyKey);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof InsufficientUsdBalanceError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    throw err;
  }
}
