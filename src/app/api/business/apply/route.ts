import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { AlreadyHasBusinessError, applyAsBusiness } from "@/lib/business/businessService";

const BUSINESS_TYPES = ["sme", "hr_bulk", "reward_platform", "travel_corporate", "white_label"];

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { legalName, regNumber, businessType } = body ?? {};

  if (typeof legalName !== "string" || !legalName.trim()) {
    return NextResponse.json({ error: "legalName is required" }, { status: 400 });
  }
  if (typeof regNumber !== "string" || !regNumber.trim()) {
    return NextResponse.json({ error: "regNumber (CAC registration number) is required" }, { status: 400 });
  }
  if (!BUSINESS_TYPES.includes(businessType)) {
    return NextResponse.json({ error: `businessType must be one of ${BUSINESS_TYPES.join(", ")}` }, { status: 400 });
  }

  try {
    const result = await applyAsBusiness(userId, legalName.trim(), regNumber ?? null, businessType);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AlreadyHasBusinessError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
