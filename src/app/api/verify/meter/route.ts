import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rateLimit";

// Meter / customer-name lookup before an electricity purchase, so the user
// confirms they're paying the right meter. Real disco validation arrives with
// the VTU aggregator (verify() on the adapter); until then this is a deterministic
// mock: any 11+ digit meter number resolves to a placeholder customer.
//
// TODO(vtu): replace the mock body with adapter.verify({ serviceType:
// 'electricity', network: disco, phone: meterNo, meterType }).
const DISCOS = ["IKEDC", "EKEDC", "AEDC", "PHED", "IBEDC", "KEDCO", "JED", "KAEDCO", "BEDC", "EEDC"];

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    await checkRateLimit(`verify_meter:${userId}`, 20, 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many lookups — slow down" }, { status: 429 });
    }
    throw err;
  }

  const body = await req.json().catch(() => null);
  const disco = body?.disco;
  const meterNo = body?.meterNo;
  const meterType = body?.meterType === "postpaid" ? "postpaid" : "prepaid";

  if (typeof disco !== "string" || !DISCOS.includes(disco)) {
    return NextResponse.json({ error: "Choose a valid electricity provider" }, { status: 400 });
  }
  if (typeof meterNo !== "string" || !/^\d{10,13}$/.test(meterNo)) {
    return NextResponse.json({ verified: false, error: "Enter a valid meter number" }, { status: 200 });
  }

  // Deterministic placeholder — real disco returns the registered customer name.
  return NextResponse.json({
    verified: true,
    customerName: "raviion TEST CUSTOMER",
    address: "Lagos, NG",
    disco,
    meterType,
  });
}
