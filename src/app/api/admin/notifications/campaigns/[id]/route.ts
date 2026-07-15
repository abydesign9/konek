import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { deleteCampaign, getCampaign, NotFoundError, SentCampaignImmutableError } from "@/lib/notifications/campaigns";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getCampaign(params.id));
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    await assertPermission(admin.role, "marketing.manage");
    await deleteCampaign(params.id, admin.adminUserId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof SentCampaignImmutableError) return NextResponse.json({ error: err.message }, { status: 409 });
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
