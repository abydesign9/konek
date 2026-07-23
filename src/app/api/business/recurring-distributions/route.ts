import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { canDistribute, requireVerifiedBusiness } from "@/lib/business/teamService";
import { createRecurringDistribution, listRecurringDistributions } from "@/lib/recurring/recurringDistributions";

const VALID_SERVICE_TYPES = ["airtime", "data"];
const VALID_NETWORKS = ["mtn", "glo", "airtel", "9mobile"];
const VALID_INTERVALS = [7, 30];

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok && gate.code !== "no_business") return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });
  if (!gate.ok) return NextResponse.json({ schedules: [] });
  const membership = gate.membership;

  return NextResponse.json({ schedules: await listRecurringDistributions(membership.businessAccountId) });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok && gate.code !== "no_business") return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });
  if (!gate.ok) return NextResponse.json({ error: "no business account — apply first" }, { status: 404 });
  const membership = gate.membership;
  if (!canDistribute(membership.role)) {
    return NextResponse.json({ error: `Your role (${membership.role}) cannot run distributions` }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const purpose = body?.purpose;
  const serviceType = body?.serviceType;
  const amountMinorPerRecipient = Number(body?.amountMinorPerRecipient);
  const recipients = body?.recipients;
  const intervalDays = Number(body?.intervalDays);

  if (typeof purpose !== "string" || !purpose.trim()) {
    return NextResponse.json({ error: "purpose is required" }, { status: 400 });
  }
  if (!VALID_SERVICE_TYPES.includes(serviceType)) {
    return NextResponse.json({ error: `serviceType must be one of ${VALID_SERVICE_TYPES.join(", ")}` }, { status: 400 });
  }
  if (!Number.isInteger(amountMinorPerRecipient) || amountMinorPerRecipient <= 0) {
    return NextResponse.json({ error: "amountMinorPerRecipient must be a positive integer" }, { status: 400 });
  }
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: "recipients must be a non-empty array" }, { status: 400 });
  }
  for (const r of recipients) {
    if (!VALID_NETWORKS.includes(r.network) || typeof r.phone !== "string" || r.phone.length < 10) {
      return NextResponse.json({ error: "each recipient needs a valid network and phone" }, { status: 400 });
    }
  }
  if (!VALID_INTERVALS.includes(intervalDays)) {
    return NextResponse.json({ error: `intervalDays must be one of ${VALID_INTERVALS.join(", ")}` }, { status: 400 });
  }

  const result = await createRecurringDistribution(membership.businessAccountId, userId, {
    purpose,
    serviceType,
    amountMinorPerRecipient,
    recipients,
    intervalDays,
  });
  return NextResponse.json(result);
}
