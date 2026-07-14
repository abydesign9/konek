import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getKycStatus } from "@/lib/kyc/kycService";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json(await getKycStatus(userId));
}
