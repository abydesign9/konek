import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getKycStatus } from "@/lib/kyc/kycService";


export async function GET() {

  const userId =
    await getSessionUserId();


  if(!userId){

    return NextResponse.json(
      {error:"Unauthorized"},
      {status:401}
    );

  }


  const kyc =
    await getKycStatus(userId);



  return NextResponse.json({

    tier: kyc.tier,

    status: kyc.status,

    bvnVerified: kyc.bvnVerified,

    ninVerified: kyc.ninVerified,

    livenessVerified: kyc.livenessVerified,

    duplicateFlag: kyc.duplicateFlag,

  });


}
