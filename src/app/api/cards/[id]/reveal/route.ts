import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { CardNotActiveError, revealCardDetails } from "@/lib/cards/cardService";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rateLimit";
import { assertKycTier, KYC_TIER, KycGateError } from "@/lib/kyc/tiers";

// POST (not GET) so card details never land in a URL, referrer or server log.
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {

  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401 }
    );
  }


  // Revealing card details requires Finance KYC
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



  try {

    await checkRateLimit(
      `card_reveal:${userId}`,
      10,
      10 * 60 * 1000
    );

  } catch (err) {

    if (err instanceof RateLimitExceededError) {

      return NextResponse.json(
        {
          error:"Too many attempts — try again shortly"
        },
        {
          status:429
        }
      );

    }

    throw err;

  }



  try {

    const details =
      await revealCardDetails(
        params.id,
        userId
      );

    return NextResponse.json(details);


  } catch (err) {


    if (err instanceof CardNotActiveError) {

      return NextResponse.json(
        {
          error:"card not found"
        },
        {
          status:404
        }
      );

    }


    throw err;

  }

}
