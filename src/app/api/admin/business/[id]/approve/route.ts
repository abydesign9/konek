import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin/session";
import { approveBusiness } from "@/lib/business/businessService";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!isAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await approveBusiness(params.id, "admin");
  return NextResponse.json({ ok: true });
}
