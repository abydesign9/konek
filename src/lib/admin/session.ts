import crypto from "node:crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "konek_admin";
const ADMIN_TTL_HOURS = 12;

// Single shared-secret admin session — deliberately minimal for the
// founder-only console at this stage. Real RBAC (per-admin accounts,
// audit trail of who did what) is follow-up work before opening this up
// to more than one operator.
function expectedToken(): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) throw new Error("Missing ADMIN_SECRET env var");
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export function createAdminSession(providedSecret: string): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) throw new Error("Missing ADMIN_SECRET env var");

  const a = Buffer.from(providedSecret);
  const b = Buffer.from(secret);
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!valid) return false;

  cookies().set(ADMIN_COOKIE, expectedToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_TTL_HOURS * 60 * 60,
    path: "/",
  });
  return true;
}

export function isAdminSession(): boolean {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expectedToken());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function clearAdminSession() {
  cookies().delete(ADMIN_COOKIE);
}
