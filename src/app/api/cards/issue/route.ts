import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { issueCard, NoDollarAccountError, CardCreationFeeUnpaidError } from "@/lib/cards/cardService";
import { assertKycTier, KYC_TIER, KycGateError } from "@/lib/kyc/tiers";

export async function POST() {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401 }
    );
  }


  // Cards require Finance KYC:
  // BVN/NIN + liveness verification
  try {
    await assertKycTier(
      userId,
      KYC_TIER.FINANCE
    );

  } catch (err) {

    if (err instanceof KycGateError) {

      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          requiredTier: err.requiredTier,
        },
        {
          status: 403,
        }
      );

    }

    throw err;
  }



  try {

    const result =
      await issueCard(userId);

    return NextResponse.json(result);


  } catch (err) {


    if (err instanceof NoDollarAccountError) {

      return NextResponse.json(
        {
          error: err.message,
          code: "no_dollar_account",
        },
        {
          status: 403,
        }
      );

    }

    if (err instanceof CardCreationFeeUnpaidError) {
      return NextResponse.json({ error: err.message, code: "fee_unpaid", feeMinor: err.feeMinor }, { status: 402 });
    }


    throw err;

  }
}
