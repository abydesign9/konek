import { query } from "@/lib/db";

// Durable rate limiter backed by Postgres (see migration 0023). The previous
// implementation used an in-process Map, which does not survive a serverless
// deployment: each instance kept its own counter, so limits reset on every
// cold start and never shared across concurrent instances. This variant is
// authoritative across all instances and atomic under concurrency (the counting
// happens inside rl_hit via INSERT .. ON CONFLICT DO UPDATE).
export class RateLimitExceededError extends Error {
  constructor(key: string) {
    super(`Rate limit exceeded for ${key}`);
    this.name = "RateLimitExceededError";
  }
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<void> {
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const { rows } = await query<{ allowed: boolean }>(
    `SELECT rl_hit($1, $2, $3) AS allowed`,
    [key, windowStart, maxRequests]
  );
  if (!rows[0]?.allowed) throw new RateLimitExceededError(key);
}

// Behind a trusted proxy (Vercel), x-real-ip is set by the platform to the true
// client address and cannot be forged by the client. The left-most entry of
// X-Forwarded-For, by contrast, is fully client-controlled and was previously
// trusted here — letting an attacker rotate the header to defeat per-IP limits
// and poison audit-log IPs. Prefer x-real-ip; fall back to the left-most XFF
// only for local/non-proxied development.
export function clientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}
