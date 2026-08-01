import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";

// Lightweight "am I logged in?" check for public/marketing pages so the header
// can swap "Log in / Get started" for "Go to app". Reads the session cookie
// only — no heavy work. Never cached (it's under /api → no-store).
export async function GET() {
  const userId = await getSessionUserId();
  return NextResponse.json({ authed: !!userId });
}
