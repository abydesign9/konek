import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import {
  createRecurringTopup,
  listRecurringTopups,
  RECURRING_TOPUP_PRESETS_USD_MINOR,
} from "@/lib/recurring/recurringTopups";

const VALID_INTERVALS = [7, 30];

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ schedules: await listRecurringTopups(userId) });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const phone = body?.phone;
  const network = body?.network;
  const amountMinor = Number(body?.amountMinor);
  const intervalDays = Number(body?.intervalDays);

  if (typeof phone !== "string" || phone.length < 6) {
    return NextResponse.json({ error: "a valid phone number is required" }, { status: 400 });
  }
  if (typeof network !== "string" || !network.includes(":")) {
    return NextResponse.json({ error: "network must be a country:carrier pair" }, { status: 400 });
  }
  if (!RECURRING_TOPUP_PRESETS_USD_MINOR.includes(amountMinor)) {
    return NextResponse.json(
      { error: `amountMinor (USD cents) must be one of ${RECURRING_TOPUP_PRESETS_USD_MINOR.join(", ")}` },
      { status: 400 }
    );
  }
  if (!VALID_INTERVALS.includes(intervalDays)) {
    return NextResponse.json({ error: `intervalDays must be one of ${VALID_INTERVALS.join(", ")}` }, { status: 400 });
  }

  const result = await createRecurringTopup(userId, { phone, network, amountMinor, intervalDays });
  return NextResponse.json(result);
}
