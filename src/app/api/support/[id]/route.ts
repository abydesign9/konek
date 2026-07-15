import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getThread, NotFoundError } from "@/lib/support/supportService";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const thread = await getThread(params.id, userId);
    return NextResponse.json(thread);
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
