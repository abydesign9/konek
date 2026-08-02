import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getMembership } from "@/lib/business/teamService";
import { fundBusinessFromOwner, getBusinessOwner, BusinessFundingError } from "@/lib/business/businessWallet";
import { query } from "@/lib/db";
import { isWalletInsufficientError } from "@/lib/ledger/reservations";

// Owner tops up the business wallet from their own personal wallet — an in-app
// double-entry transfer. Only the business owner can do this, and only once KYB
// is verified.
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const membership = await getMembership(userId);
  if (!membership) return NextResponse.json({ error: "No business account" }, { status: 403 });

  const businessId = membership.businessAccountId;
  const ownerId = await getBusinessOwner(businessId);
  if (ownerId !== userId) {
    return NextResponse.json({ error: "Only the business owner can add funds" }, { status: 403 });
  }

  const { rows } = await query<{ kyb_status: string }>(
    `SELECT kyb_status FROM business_accounts WHERE id = $1`,
    [businessId]
  );
  if (rows[0]?.kyb_status !== "verified") {
    return NextResponse.json({ error: "Business verification (KYB) must be approved first" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey : null;
  if (!idempotencyKey) return NextResponse.json({ error: "idempotencyKey required" }, { status: 400 });

  try {
    const { balanceMinor } = await fundBusinessFromOwner({
      businessId,
      ownerUserId: userId,
      currency: body?.currency ?? "NGN",
      amountMinor: Number(body?.amountMinor),
      idempotencyKey,
    });
    return NextResponse.json({ ok: true, balanceMinor });
  } catch (err) {
    if (err instanceof BusinessFundingError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    // Non-negative ledger guard rejects an overdraw of the owner's wallet.
    // Match only that specific trigger error — anything else is a real bug and
    // must not be relabeled as "insufficient balance", which would hide it.
    if (isWalletInsufficientError(err)) {
      return NextResponse.json({ error: "Insufficient balance in your personal wallet" }, { status: 400 });
    }
    console.error("[business/fund] error:", err);
    return NextResponse.json({ error: "Could not add funds. Try again." }, { status: 500 });
  }
}
