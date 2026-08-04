import crypto from "node:crypto";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

const SESSION_COOKIE = "konek_session";
const SESSION_TTL_DAYS = 30;

function hashToken(token: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Missing SESSION_SECRET env var");
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

export async function createSession(userId: string, meta?: { userAgent?: string | null; ip?: string | null }) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO sessions (user_id, token_hash, expires_at, user_agent, ip) VALUES ($1, $2, $3, $4, $5)`,
    [userId, tokenHash, expiresAt, meta?.userAgent ?? null, meta?.ip ?? null]
  );

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function getSessionUserId(): Promise<string | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const { rows } = await query<{ user_id: string }>(
    `SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > now()`,
    [tokenHash]
  );
  return rows[0]?.user_id ?? null;
}

// The session id for the *current* browser, so the sessions-management
// screen can mark it "This device" and refuse to let it revoke itself.
export async function getCurrentSessionId(): Promise<string | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashToken(token);
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM sessions WHERE token_hash = $1 AND expires_at > now()`,
    [tokenHash]
  );
  return rows[0]?.id ?? null;
}

// Cheap heartbeat — called from the sessions-management screen itself
// (not every request) so "last seen" is meaningful without adding a write
// to every authenticated page load.
export async function touchCurrentSession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return;
  const tokenHash = hashToken(token);
  await query(`UPDATE sessions SET last_seen_at = now() WHERE token_hash = $1`, [tokenHash]);
}

export async function clearSession() {
  cookies().delete(SESSION_COOKIE);
}
