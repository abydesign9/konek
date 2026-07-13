import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { InsufficientBalanceError, purchaseVtu } from "@/lib/purchases/purchaseVtuService";
import { NoHealthyVendorError } from "@/vendors/registry";
import { VendorServiceType } from "@/vendors/types";

const SUPPORTED_TYPES: VendorServiceType[] = ["airtime", "data"];
const NETWORKS = ["mtn", "glo", "airtel", "9mobile"];

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { serviceType, network, phone, amountMinor, planExternalId, idempotencyKey } = body ?? {};

  if (!SUPPORTED_TYPES.includes(serviceType)) {
    return NextResponse.json({ error: `serviceType must be one of ${SUPPORTED_TYPES.join(", ")}` }, { status: 400 });
  }
  if (!NETWORKS.includes(network)) {
    return NextResponse.json({ error: `network must be one of ${NETWORKS.join(", ")}` }, { status: 400 });
  }
  if (typeof phone !== "string" || phone.length < 10) {
    return NextResponse.json({ error: "valid phone is required" }, { status: 400 });
  }
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    return NextResponse.json({ error: "amountMinor must be a positive integer" }, { status: 400 });
  }
  if (typeof idempotencyKey !== "string" || idempotencyKey.length < 8) {
    return NextResponse.json({ error: "idempotencyKey is required" }, { status: 400 });
  }

  try {
    const result = await purchaseVtu({
      userId,
      idempotencyKey,
      serviceType,
      network,
      phone,
      amountMinor,
      planExternalId,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    if (err instanceof NoHealthyVendorError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    throw err;
  }
}
