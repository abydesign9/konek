import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { getContentPage, updateContentPage, normaliseSections } from "@/lib/content/contentPages";
import { logAudit } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const page = await getContentPage(params.slug, true); // include unpublished for editing
  if (!page) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ page });
}

export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await assertPermission(admin.role, "marketing.manage");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const b = await req.json().catch(() => null);
  const page = await updateContentPage(
    params.slug,
    {
      title: typeof b?.title === "string" ? b.title : undefined,
      subtitle: "subtitle" in (b ?? {}) ? b.subtitle : undefined,
      sections: b?.sections ? normaliseSections(b.sections) : undefined,
      published: typeof b?.published === "boolean" ? b.published : undefined,
    },
    admin.adminUserId
  );
  await logAudit(admin.adminUserId, "content_page_updated", "content_page", params.slug, { title: page.title });
  return NextResponse.json({ ok: true, page });
}
