import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { requireVerifiedBusiness, assertCanManageMoney, ForbiddenRoleError } from "@/lib/business/teamService";
import {
  listVendorTransfers,
  sendVendorTransfer,
  VendorNotFoundError,
  InsufficientBusinessBalanceError,
  InvalidBankDetailsError,
} from "@/lib/business/businessVendorService";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rateLimit";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });

  const transfers = await listVendorTransfers(gate.membership.businessAccountId);
  return NextResponse.json({ transfers });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });

  try {
    assertCanManageMoney(gate.membership.role);
  } catch (err) {
    if (err instanceof ForbiddenRoleError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  try {
    await checkRateLimit(`vendor_transfer:${gate.membership.businessAccountId}`, 10, 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
    }
    throw err;
  }

  const body = await req.json().catch(() => null);
  const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey : null;
  if (!idempotencyKey) return NextResponse.json({ error: "idempotencyKey required" }, { status: 400 });
  if (typeof body?.vendorId !== "string") return NextResponse.json({ error: "vendorId is required" }, { status: 400 });

  try {
    const result = await sendVendorTransfer(gate.membership.businessAccountId, userId, {
      vendorId: body.vendorId,
      amountMinor: Number(body?.amountMinor),
      idempotencyKey,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof VendorNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    if (err instanceof InsufficientBusinessBalanceError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof InvalidBankDetailsError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
