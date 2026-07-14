import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { AlreadyAnAgentError, applyAsAgent } from "@/lib/agents/agentService";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const result = await applyAsAgent(userId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AlreadyAnAgentError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
