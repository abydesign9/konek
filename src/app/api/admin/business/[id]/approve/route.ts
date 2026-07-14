import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { approveBusiness } from "@/lib/business/businessService";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await approveBusiness(params.id, admin.email);
  return NextResponse.json({ ok: true });
}
