import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { AlreadyHasAccountError, createGlobalAccount, KycTierTooLowError } from "@/lib/dollarAccount/dollarAccountService";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));

    const currency =
      body.currency === "GBP" || body.currency === "EUR"
        ? body.currency
        : "USD";

    const result = await createGlobalAccount(userId, currency);
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
