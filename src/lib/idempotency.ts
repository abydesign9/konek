import crypto from "node:crypto";
import { query } from "@/lib/db";

export class IdempotencyConflictError extends Error {
  constructor(key: string) {
    super(`Idempotency key ${key} was already used with a different request payload`);
    this.name = "IdempotencyConflictError";
  }
}

export class IdempotencyInProgressError extends Error {
  constructor(key: string) {
    super(`Idempotency key ${key} is still being processed by another request`);
    this.name = "IdempotencyInProgressError";
  }
}

export function hashRequest(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

// Every external/mutating call should be wrapped in this: the first call
// with a given key runs `fn` and stores its result; replays with the same
// key + payload return the stored result without re-running `fn`. Replays
// with the same key but a different payload are rejected.
export async function withIdempotency<T>(
  key: string,
  requestPayload: unknown,
  fn: () => Promise<T>
): Promise<T> {
  const requestHash = hashRequest(requestPayload);

  const claim = await query<{ key: string }>(
    `INSERT INTO idempotency_keys (key, request_hash, status)
     VALUES ($1, $2, 0)
     ON CONFLICT (key) DO NOTHING
     RETURNING key`,
    [key, requestHash]
  );

  if (claim.rows.length === 0) {
    const { rows } = await query<{ request_hash: string; response: T | null; status: number }>(
      `SELECT request_hash, response, status FROM idempotency_keys WHERE key = $1`,
      [key]
    );
    const existing = rows[0];
    if (!existing || existing.request_hash !== requestHash) {
      throw new IdempotencyConflictError(key);
    }
    if (existing.status === 0) {
      throw new IdempotencyInProgressError(key);
    }
    return existing.response as T;
  }

  try {
    const result = await fn();

    await query(
      `UPDATE idempotency_keys SET response = $2, status = 1 WHERE key = $1`,
      [key, JSON.stringify(result)]
    );

    return result;
  } catch (err) {
    // Release the claim so a client can retry with the same key after
    // fixing the underlying problem (e.g. top up, then retry the purchase).
    await query(`DELETE FROM idempotency_keys WHERE key = $1`, [key]);
    throw err;
  }
}
