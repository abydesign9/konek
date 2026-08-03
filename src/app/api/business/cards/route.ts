import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { requireVerifiedBusiness, assertCanManageMoney, ForbiddenRoleError } from "@/lib/business/teamService";
import {
  listBusinessCards,
  issueBusinessCard,
  BusinessCardProductUnavailableError,
  BusinessCardFeeUnpaidError,
} from "@/lib/business/businessCardService";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rateLimit";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });

  const cards = await listBusinessCards(gate.membership.businessAccountId);
  return NextResponse.json({ cards });
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
    await checkRateLimit(`business_card_issue:${gate.membership.businessAccountId}`, 5, 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
    }
    throw err;
  }

  const body = await req.json().catch(() => null);
  const productId = body?.productId;
  if (typeof productId !== "string" || !productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }
  const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey : null;
  if (!idempotencyKey) return NextResponse.json({ error: "idempotencyKey required" }, { status: 400 });

  try {
    const { cardId } = await issueBusinessCard(
      gate.membership.businessAccountId,
      userId,
      productId,
      idempotencyKey,
      typeof body?.label === "string" ? body.label.slice(0, 60) : undefined
    );
    return NextResponse.json({ cardId });
  } catch (err) {
    if (err instanceof BusinessCardProductUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof BusinessCardFeeUnpaidError) {
      return NextResponse.json({ error: err.message, feeMinor: err.feeMinor }, { status: 402 });
    }
    throw err;
  }
}
