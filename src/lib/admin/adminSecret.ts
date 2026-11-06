import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { getConfigValue, setConfigValue } from "@/lib/config/platformConfig";
import { logAudit } from "@/lib/audit";

// raviion's admin auth is one shared secret (env var ADMIN_SECRET) plus an
// allowlisted email — there's no per-admin password. "Change password" maps
// onto that real model as rotating this shared secret through the app
// (stored hashed in platform_config) instead of only via an env-var
// redeploy. If it's never rotated, the env var keeps working exactly as
// before — this is additive, not a breaking change to existing sessions.
const CONFIG_KEY = "admin_secret_hash";

function envSecretMatches(provided: string): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function verifyAdminSecret(provided: string): Promise<boolean> {
  const stored = await getConfigValue<{ hash: string } | null>(CONFIG_KEY, null);
  if (stored?.hash) return bcrypt.compare(provided, stored.hash);
  return envSecretMatches(provided);
}

export class IncorrectCurrentSecretError extends Error {
  constructor() {
    super("Current admin secret is incorrect");
    this.name = "IncorrectCurrentSecretError";
  }
}
export class WeakSecretError extends Error {
  constructor() {
    super("New secret must be at least 12 characters");
    this.name = "WeakSecretError";
  }
}

export async function rotateAdminSecret(currentSecret: string, newSecret: string, actorId: string): Promise<void> {
  if (!(await verifyAdminSecret(currentSecret))) throw new IncorrectCurrentSecretError();
  if (newSecret.length < 12) throw new WeakSecretError();

  const hash = await bcrypt.hash(newSecret, 10);
  await setConfigValue(CONFIG_KEY, { hash }, actorId);
  await logAudit(actorId, "admin_secret_rotated", "platform_config", CONFIG_KEY);
}

export async function hasRotatedSecret(): Promise<boolean> {
  const stored = await getConfigValue<{ hash: string } | null>(CONFIG_KEY, null);
  return !!stored?.hash;
}
