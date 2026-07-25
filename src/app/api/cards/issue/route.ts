import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { issueCard, NoDollarAccountError, CardCreationFeeUnpaidError, CardProductUnavailableError } from "@/lib/cards/cardService";
import { assertKycTier, KYC_TIER, KycGateError } from "@/lib/kyc/tiers";

export async function POST(req: NextRequest) {
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



  const body = await req.json().catch(() => null);
  const productId = typeof body?.productId === "string" ? body.productId : "";
  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  try {

    const result =
      await issueCard(userId, productId);

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

    if (err instanceof CardProductUnavailableError) {
      return NextResponse.json({ error: err.message, code: "product_unavailable" }, { status: 400 });
    }


    throw err;

  }
}
