import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { deactivateAdminUser } from "@/lib/admin/adminUsers";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await deactivateAdminUser(params.id, admin.adminUserId);
  return NextResponse.json({ ok: true });
}
