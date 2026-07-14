// In-memory sliding-window limiter. Fine for a single-instance dev/small
// deployment; move to Redis (per the stack notes) before running more than
// one server instance, since this state doesn't share across processes.
const hits = new Map<string, number[]>();

export class RateLimitExceededError extends Error {
  constructor(key: string) {
    super(`Rate limit exceeded for ${key}`);
    this.name = "RateLimitExceededError";
  }
}

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): void {
  const now = Date.now();
  const windowStart = now - windowMs;
  const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= maxRequests) {
    hits.set(key, timestamps);
    throw new RateLimitExceededError(key);
  }

  timestamps.push(now);
  hits.set(key, timestamps);
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}
