import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { requireVerifiedBusiness, assertCanManageMoney, ForbiddenRoleError } from "@/lib/business/teamService";
import { revealBusinessCardDetails } from "@/lib/business/businessCardService";
import { checkRateLimit, RateLimitExceededError } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";

// Sensitive card details (PAN/CVV) — rate-limited and audit-logged like the
// personal reveal endpoint. Never persisted; fetched from the issuer each time.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
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
    await checkRateLimit(`business_card_reveal:${userId}`, 10, 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
    }
    throw err;
  }

  try {
    const details = await revealBusinessCardDetails(params.id, gate.membership.businessAccountId);
    await logAudit(userId, "business_card_revealed", "business_card", params.id, {});
    return NextResponse.json(details);
  } catch {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
}
