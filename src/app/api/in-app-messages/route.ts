import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { listActiveInAppMessages } from "@/lib/notifications/inAppMessages";

// Powers whatever renders the CMS banners/cards — deliberately not wired
// into a specific screen yet (that's part of the upcoming home-screen
// redesign phase); this is the real, working data source for it.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ messages: await listActiveInAppMessages() });
}
