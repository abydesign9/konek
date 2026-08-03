import { NextRequest, NextResponse } from "next/server";
import { createAdminSession } from "@/lib/admin/session";
import { checkRateLimit, clientIp, RateLimitExceededError } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = body?.email;
  // Accept either field name: "password" (per-admin) or legacy "secret".
  const credential = typeof body?.password === "string" ? body.password : body?.secret;
  if (typeof credential !== "string" || credential.length === 0) {
    return NextResponse.json({ error: "password is required" }, { status: 400 });
  }
  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "a valid email is required" }, { status: 400 });
  }

  try {
    // Admin accounts are a higher-value target than customer accounts, so
    // this is tighter per-email than the customer login's 8/15min — plus
    // the IP key, so distributing guesses across many source IPs doesn't
    // bypass the per-account throttle.
    await checkRateLimit(`admin_login:email:${email.toLowerCase()}`, 5, 15 * 60 * 1000);
    await checkRateLimit(`admin_login:ip:${clientIp(req)}`, 15, 15 * 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "Too many attempts — try again shortly" }, { status: 429 });
    }
    throw err;
  }

  const ok = await createAdminSession(email, credential);
  if (!ok) return NextResponse.json({ error: "invalid email or password" }, { status: 401 });

  return NextResponse.json({ ok: true });
}
