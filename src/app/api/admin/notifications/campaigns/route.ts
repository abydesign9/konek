import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { createCampaign, listCampaigns, type Audience } from "@/lib/notifications/campaigns";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

const VALID_AUDIENCES: Audience[] = ["all", "tier1", "tier2", "business", "agent", "diaspora", "new_users", "custom"];
const VALID_CHANNELS = ["push", "in_app", "email", "sms", "whatsapp"];
const VALID_SCHEDULE_TYPES = ["immediate", "scheduled", "recurring"];

export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ campaigns: await listCampaigns() });
}

export async function POST(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { title, description, subject, body: message, category, channels, audience, audiencePhones, scheduleType, scheduledAt, recurringIntervalHours, timezone, expiryAt } = body ?? {};

  if (typeof title !== "string" || !title.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (typeof subject !== "string" || !subject.trim()) return NextResponse.json({ error: "subject is required" }, { status: 400 });
  if (typeof message !== "string" || !message.trim()) return NextResponse.json({ error: "body is required" }, { status: 400 });
  if (!Array.isArray(channels) || channels.some((c) => !VALID_CHANNELS.includes(c))) {
    return NextResponse.json({ error: `channels must be a subset of ${VALID_CHANNELS.join(", ")}` }, { status: 400 });
  }
  if (!VALID_AUDIENCES.includes(audience)) {
    return NextResponse.json({ error: `audience must be one of ${VALID_AUDIENCES.join(", ")}` }, { status: 400 });
  }
  if (!VALID_SCHEDULE_TYPES.includes(scheduleType)) {
    return NextResponse.json({ error: `scheduleType must be one of ${VALID_SCHEDULE_TYPES.join(", ")}` }, { status: 400 });
  }
  if (scheduleType !== "immediate" && typeof scheduledAt !== "string") {
    return NextResponse.json({ error: "scheduledAt is required for scheduled/recurring campaigns" }, { status: 400 });
  }

  try {
    await assertPermission(admin.role, "marketing.manage");
    const result = await createCampaign(
      {
        title: title.trim(),
        description: description?.trim(),
        subject: subject.trim(),
        body: message.trim(),
        category: category?.trim(),
        channels,
        audience,
        audiencePhones: Array.isArray(audiencePhones) ? audiencePhones : undefined,
        scheduleType,
        scheduledAt,
        recurringIntervalHours: typeof recurringIntervalHours === "number" ? recurringIntervalHours : undefined,
        timezone,
        expiryAt,
      },
      admin.adminUserId
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
