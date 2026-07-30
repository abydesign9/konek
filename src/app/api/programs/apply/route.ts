import { NextRequest, NextResponse } from "next/server";
import { submitApplication, ValidationError } from "@/lib/programs/applicationService";
import { checkRateLimit, clientIp, RateLimitExceededError } from "@/lib/rateLimit";

// Public community-program application (Campus Ambassador / Influencer / Creator
// Club). Intentionally unauthenticated — it's a marketing lead form, not an app
// account. It never touches the ledger and only writes to program_applications.
// Rate-limited per IP to stop spam/floods.
export async function POST(req: NextRequest) {
  try {
    await checkRateLimit(`program_apply:ip:${clientIp(req)}`, 5, 60 * 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many applications from this network — please try again later." }, { status: 429 });
    }
    throw err;
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  try {
    const { id } = await submitApplication(body as Record<string, unknown>);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[programs/apply] unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
