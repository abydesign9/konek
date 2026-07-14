import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { AlreadyHasAccountError, createDollarAccount, KycTierTooLowError } from "@/lib/dollarAccount/dollarAccountService";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const result = await createDollarAccount(userId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof KycTierTooLowError) {
      return NextResponse.json({ error: err.message, code: "kyc_tier_too_low" }, { status: 403 });
    }
    if (err instanceof AlreadyHasAccountError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
