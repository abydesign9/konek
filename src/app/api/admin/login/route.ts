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
    await checkRateLimit(`admin_login:${clientIp(req)}`, 5, 15 * 60 * 1000); // 5 attempts per 15 min per IP
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
