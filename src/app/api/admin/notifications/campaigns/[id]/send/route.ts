import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { NotFoundError, sendCampaignNow } from "@/lib/notifications/campaigns";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

// Fires a campaign right now — the "Send Immediately" action, and (since no
// dispatch worker exists yet) also how an admin manually triggers a
// scheduled/recurring campaign.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    await assertPermission(admin.role, "marketing.manage");
    const result = await sendCampaignNow(params.id, admin.adminUserId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
