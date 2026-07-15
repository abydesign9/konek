import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { setCategoryAndPriority, NotFoundError, type SupportPriority } from "@/lib/support/supportService";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

const VALID_PRIORITIES: SupportPriority[] = ["low", "medium", "high", "urgent"];
const VALID_CATEGORIES = ["kyc", "payments", "vtu", "esim", "card", "dollar_account", "other"];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const category = body?.category ?? null;
  const priority = body?.priority;
  if (category !== null && !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: `category must be one of ${VALID_CATEGORIES.join(", ")}` }, { status: 400 });
  }
  if (!VALID_PRIORITIES.includes(priority)) {
    return NextResponse.json({ error: `priority must be one of ${VALID_PRIORITIES.join(", ")}` }, { status: 400 });
  }

  try {
    await assertPermission(admin.role, "support.reply");
    await setCategoryAndPriority(params.id, category, priority, admin.adminUserId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
