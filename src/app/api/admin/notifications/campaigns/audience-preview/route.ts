import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { previewAudienceSize, type Audience } from "@/lib/notifications/campaigns";

const VALID_AUDIENCES: Audience[] = ["all", "tier1", "tier2", "business", "agent", "diaspora", "new_users", "custom"];

// Lets the compose UI show "~N recipients" before saving.
export async function POST(req: NextRequest) {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const audience = body?.audience;
  if (!VALID_AUDIENCES.includes(audience)) {
    return NextResponse.json({ error: `audience must be one of ${VALID_AUDIENCES.join(", ")}` }, { status: 400 });
  }
  const size = await previewAudienceSize(audience, Array.isArray(body?.audiencePhones) ? body.audiencePhones : undefined);
  return NextResponse.json({ size });
}
