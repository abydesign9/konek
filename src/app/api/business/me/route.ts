import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { canDistribute, getMembership } from "@/lib/business/teamService";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Membership-aware: team members see the business too, with their role.
  const membership = await getMembership(userId);
  if (!membership) return NextResponse.json({ business: null, role: null, canDistribute: false });

  const { rows } = await query(
    `SELECT id, legal_name, business_type, kyb_status, created_at FROM business_accounts WHERE id = $1`,
    [membership.businessAccountId]
  );
  return NextResponse.json({
    business: rows[0] ?? null,
    role: membership.role,
    canDistribute: canDistribute(membership.role),
  });
}
