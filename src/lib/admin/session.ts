import crypto from "node:crypto";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import { findActiveAdminByEmail } from "./adminUsers";
import { verifyPasswordLogin, InvalidCredentialsError } from "@/lib/auth/password";

const ADMIN_COOKIE = "raviion_admin";
const ADMIN_TTL_HOURS = 12;

interface AdminSessionPayload {
  adminUserId: string;
  email: string;
  role: string;
  exp: number;
}

function sign(payload: string): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) throw new Error("Missing ADMIN_SECRET env var");
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

// Admins sign in with their own raviion account credentials: the same email +
// password as their customer account (verified against the users table). Being
// an admin is a separate GRANT — an active admin_users row for that email, which
// also names the audit-log actor. So onboarding an admin is just: they have a
// raviion account, then a super_admin approves/invites their email. ADMIN_SECRET
// is used only as the cookie-signing key below, never as a login credential.
export async function createAdminSession(email: string, password: string): Promise<boolean> {
  // 1. Authenticate the raviion (customer) credentials.
  let userId: string;
  try {
    ({ userId } = await verifyPasswordLogin(email, password));
  } catch (err) {
    if (err instanceof InvalidCredentialsError) return false;
    throw err;
  }

  // 2. The account must be active (a suspended/closed user can't hold admin).
  const { rows: statusRows } = await query<{ status: string }>(`SELECT status FROM users WHERE id = $1`, [userId]);
  if (statusRows[0]?.status !== "active") return false;

  // 3. The email must carry an admin grant (or bootstrap the first one).
  const admin = await findActiveAdminByEmail(email);
  if (!admin) return false;

  const exp = Date.now() + ADMIN_TTL_HOURS * 60 * 60 * 1000;
  const payload: AdminSessionPayload = { adminUserId: admin.id, email: admin.email, role: admin.role, exp };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadJson).toString("base64url");
  const signature = sign(payloadB64);

  cookies().set(ADMIN_COOKIE, `${payloadB64}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: ADMIN_TTL_HOURS * 60 * 60,
    path: "/",
  });
  return true;
}

export function getAdminSession(): AdminSessionPayload | null {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  let expectedSig: string;
  try {
    expectedSig = sign(payloadB64);
  } catch {
    return null;
  }
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload: AdminSessionPayload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function isAdminSession(): boolean {
  return getAdminSession() !== null;
}

export function clearAdminSession() {
  cookies().delete(ADMIN_COOKIE);
}
