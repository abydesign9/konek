import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { joinSquad } from "@/lib/gamification/squads";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  await joinSquad(params.id, userId);
  return NextResponse.json({ ok: true });
}
