import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { completeThreeDsAndSettle } from "@/lib/cards/cardService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { threeDsChallengeId, code } = body ?? {};
  if (typeof threeDsChallengeId !== "string" || typeof code !== "string") {
    return NextResponse.json({ error: "threeDsChallengeId and code are required" }, { status: 400 });
  }

  const result = await completeThreeDsAndSettle(params.id, userId, threeDsChallengeId, code);
  return NextResponse.json(result);
}
