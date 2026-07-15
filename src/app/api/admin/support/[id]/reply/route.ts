import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { addAdminReply, NotFoundError } from "@/lib/support/supportService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const message = body?.body;
  const resolve = body?.resolve === true;
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  try {
    await addAdminReply(params.id, admin.adminUserId, message.trim(), resolve);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
