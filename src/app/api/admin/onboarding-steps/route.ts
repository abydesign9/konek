import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { createTourStep, listAllTourSteps } from "@/lib/onboarding/tourSteps";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

const VALID_STATUSES = ["draft", "active", "inactive"];

export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ steps: await listAllTourSteps() });
}

export async function POST(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const stepOrder = Number(body?.stepOrder);
  const icon = body?.icon;
  const title = body?.title;
  const stepBody = body?.body;
  const status = body?.status ?? "draft";

  if (!Number.isFinite(stepOrder)) return NextResponse.json({ error: "stepOrder must be a number" }, { status: 400 });
  if (typeof icon !== "string" || !icon.trim()) return NextResponse.json({ error: "icon is required" }, { status: 400 });
  if (typeof title !== "string" || !title.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (typeof stepBody !== "string" || !stepBody.trim()) return NextResponse.json({ error: "body is required" }, { status: 400 });
  if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: `status must be one of ${VALID_STATUSES.join(", ")}` }, { status: 400 });

  try {
    await assertPermission(admin.role, "marketing.manage");
    const result = await createTourStep(
      { stepOrder, icon: icon.trim(), title: title.trim(), body: stepBody.trim(), status },
      admin.adminUserId
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
