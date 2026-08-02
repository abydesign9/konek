import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getMembership } from "@/lib/business/teamService";
import { getBusinessBalances, getBusinessOwner } from "@/lib/business/businessWallet";

// The business's own wallet balances (separate ledger from the owner's personal
// wallet). Any team member can view; only the owner can fund (see /fund).
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const membership = await getMembership(userId);
  if (!membership) return NextResponse.json({ balances: [], isOwner: false });

  const [balances, ownerId] = await Promise.all([
    getBusinessBalances(membership.businessAccountId),
    getBusinessOwner(membership.businessAccountId),
  ]);

  return NextResponse.json({ balances, isOwner: ownerId === userId });
}
