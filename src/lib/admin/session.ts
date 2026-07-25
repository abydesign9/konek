import crypto from "node:crypto";
import { cookies } from "next/headers";
import { findActiveAdminByEmail } from "./adminUsers";
import { verifyAdminSecret } from "./adminSecret";
import { adminHasPassword, verifyAdminPassword } from "./adminPassword";

const ADMIN_COOKIE = "konek_admin";
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

// Login credential is per-admin: if the admin has set a password we verify that,
// otherwise we fall back to the shared secret (bootstrap, and until each admin
// sets a password). The email must match an active admin_users row, which is
// also the audit-log actor. ADMIN_SECRET stays in use only as the cookie
// signing key below, never printed and never a login credential once passwords
// are set.
export async function createAdminSession(email: string, credential: string): Promise<boolean> {
  let admin;
  if (await adminHasPassword(email)) {
    admin = await verifyAdminPassword(email, credential);
    if (!admin) return false;
  } else {
    if (!(await verifyAdminSecret(credential))) return false;
    admin = await findActiveAdminByEmail(email);
    if (!admin) return false;
  }

  const exp = Date.now() + ADMIN_TTL_HOURS * 60 * 60 * 1000;
  const payload: AdminSessionPayload = { adminUserId: admin.id, email: admin.email, role: admin.role, exp };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadJson).toString("base64url");
  const signature = sign(payloadB64);

  cookies().set(ADMIN_COOKIE, `${payloadB64}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
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
