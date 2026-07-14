import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { authorizeCardPurchase, CardNotActiveError } from "@/lib/cards/cardService";
import { expectedOtpForChallenge } from "@/vendors/cards/mockSudo";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { amountMinor, merchantName } = body ?? {};
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    return NextResponse.json({ error: "amountMinor must be a positive integer" }, { status: 400 });
  }
  if (typeof merchantName !== "string" || !merchantName.trim()) {
    return NextResponse.json({ error: "merchantName is required" }, { status: 400 });
  }

  try {
    const result = await authorizeCardPurchase(params.id, userId, amountMinor, merchantName.trim());
    // Dev-only hint since no real SMS/push 3DS challenge is actually sent —
    // matches the mock-sms OTP pattern used for phone login elsewhere.
    const devOtpHint = expectedOtpForChallenge(result.threeDsChallengeId);
    return NextResponse.json({ ...result, devOtpHint });
  } catch (err) {
    if (err instanceof CardNotActiveError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
