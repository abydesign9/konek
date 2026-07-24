import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getKycOverview } from "@/lib/kyc/verificationService";

// Country-aware KYC overview: the customer's tier and exactly which methods they
// can use to level up — driven entirely by the requirement matrix, so a US user
// never sees BVN and a Nigerian never sees SSN.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const overview = await getKycOverview(userId);
  return NextResponse.json(overview);
}
