import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { authorizeCardPurchase, CardDeclinedError, CardNotActiveError } from "@/lib/cards/cardService";
import { expectedOtpForChallenge } from "@/vendors/cards/mockSudo";
import { assertKycTier, KYC_TIER, KycGateError } from "@/lib/kyc/tiers";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {

  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401 }
    );
  }


  // Card spending requires Finance KYC
  // (BVN/NIN + liveness verification)
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
          status:403,
        }
      );

    }

    throw err;

  }



  const body = await req.json().catch(() => null);

  const {
    amountMinor,
    merchantName
  } = body ?? {};



  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {

    return NextResponse.json(
      { error:"amountMinor must be a positive integer" },
      { status:400 }
    );

  }



  if (
    typeof merchantName !== "string" ||
    !merchantName.trim()
  ) {

    return NextResponse.json(
      { error:"merchantName is required" },
      { status:400 }
    );

  }



  try {

    const result =
      await authorizeCardPurchase(
        params.id,
        userId,
        amountMinor,
        merchantName.trim()
      );


    const devOtpHint =
      expectedOtpForChallenge(
        result.threeDsChallengeId
      );


    return NextResponse.json({
      ...result,
      devOtpHint,
    });



  } catch (err) {


    if (err instanceof CardDeclinedError) {

      return NextResponse.json({
        declined:true,
        reason:err.reason,
        message:err.message,
      });

    }


    if (err instanceof CardNotActiveError) {

      return NextResponse.json(
        { error:err.message },
        { status:409 }
      );

    }


    throw err;

  }

}
