import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { issueCard, NoDollarAccountError } from "@/lib/cards/cardService";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const result = await issueCard(userId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NoDollarAccountError) {
      return NextResponse.json({ error: err.message, code: "no_dollar_account" }, { status: 403 });
    }
    throw err;
  }
}
