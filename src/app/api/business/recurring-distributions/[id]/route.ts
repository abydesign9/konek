import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { canDistribute, requireVerifiedBusiness } from "@/lib/business/teamService";
import { cancelRecurringDistribution, NotFoundError } from "@/lib/recurring/recurringDistributions";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok && gate.code !== "no_business") return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });
  if (!gate.ok) return NextResponse.json({ error: "no business account" }, { status: 404 });
  const membership = gate.membership;
  if (!canDistribute(membership.role)) {
    return NextResponse.json({ error: `Your role (${membership.role}) cannot cancel distributions` }, { status: 403 });
  }

  try {
    await cancelRecurringDistribution(params.id, membership.businessAccountId, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
