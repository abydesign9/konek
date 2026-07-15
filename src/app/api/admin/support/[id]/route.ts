import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { getAdminThread, NotFoundError } from "@/lib/support/supportService";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const thread = await getAdminThread(params.id);
    return NextResponse.json(thread);
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
