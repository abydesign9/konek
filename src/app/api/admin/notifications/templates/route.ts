import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { createTemplate, listTemplates } from "@/lib/notifications/templates";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ templates: await listTemplates() });
}

export async function POST(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = body?.name;
  const subject = body?.subject;
  const message = body?.body;
  if (typeof name !== "string" || !name.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (typeof subject !== "string" || !subject.trim()) return NextResponse.json({ error: "subject is required" }, { status: 400 });
  if (typeof message !== "string" || !message.trim()) return NextResponse.json({ error: "body is required" }, { status: 400 });

  try {
    await assertPermission(admin.role, "marketing.manage");
    const result = await createTemplate(name.trim(), subject.trim(), message.trim(), admin.adminUserId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
