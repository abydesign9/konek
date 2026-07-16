import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { cancelRecurringTopup, NotFoundError } from "@/lib/recurring/recurringTopups";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    await cancelRecurringTopup(params.id, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
