import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const PIN_PATTERN = /^\d{4,6}$/;
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCK_MINUTES = 15;

export class InvalidPinFormatError extends Error {
  constructor() {
    super("PIN must be 4-6 digits");
    this.name = "InvalidPinFormatError";
  }
}

export class PinAlreadySetError extends Error {
  constructor() {
    super("A transaction PIN is already set for this account");
    this.name = "PinAlreadySetError";
  }
}

export class PinNotSetError extends Error {
  constructor() {
    super("No transaction PIN set for this account");
    this.name = "PinNotSetError";
  }
}

export class IncorrectPinError extends Error {
  constructor() {
    super("Incorrect PIN");
    this.name = "IncorrectPinError";
  }
}

export class PinLockedError extends Error {
  constructor(readonly until: Date) {
    super("Too many incorrect PIN attempts — try again later");
    this.name = "PinLockedError";
  }
}

export async function setPin(userId: string, pin: string): Promise<void> {
  if (!PIN_PATTERN.test(pin)) throw new InvalidPinFormatError();

  const { rows } = await query<{ pin_hash: string | null }>(
    `SELECT pin_hash FROM users WHERE id = $1`,
    [userId]
  );
  if (rows[0]?.pin_hash) throw new PinAlreadySetError();

  const hash = await bcrypt.hash(pin, 10);
  await query(`UPDATE users SET pin_hash = $2, updated_at = now() WHERE id = $1`, [userId, hash]);
  await logAudit(userId, "pin_set", "user", userId);
}

export async function hasPinSet(userId: string): Promise<boolean> {
  const { rows } = await query<{ pin_hash: string | null }>(
    `SELECT pin_hash FROM users WHERE id = $1`,
    [userId]
  );
  return Boolean(rows[0]?.pin_hash);
}

export async function verifyPin(userId: string, pin: string): Promise<void> {
  if (!PIN_PATTERN.test(pin)) throw new InvalidPinFormatError();

  const { rows } = await query<{
    pin_hash: string | null;
    pin_locked_until: string | null;
  }>(
    `SELECT pin_hash, pin_locked_until FROM users WHERE id = $1`,
    [userId]
  );
  const u = rows[0];
  if (!u?.pin_hash) throw new PinNotSetError();

  // Refuse while locked. A 4-digit PIN is only a 10k space, so an active
  // session must not be able to grind it — the lock is DB-backed so it holds
  // across instances even when the app-level rate limiter's window rolls.
  if (u.pin_locked_until && new Date(u.pin_locked_until) > new Date()) {
    throw new PinLockedError(new Date(u.pin_locked_until));
  }

  const ok = await bcrypt.compare(pin, u.pin_hash);

  if (!ok) {
    // Atomic increment so parallel wrong-PIN attempts can't each read the same
    // stale counter and stop the lock from ever tripping.
    const { rows: incr } = await query<{ attempts: number }>(
      `UPDATE users SET pin_failed_attempts = pin_failed_attempts + 1, updated_at = now()
       WHERE id = $1 RETURNING pin_failed_attempts AS attempts`,
      [userId]
    );
    if ((incr[0]?.attempts ?? 0) >= MAX_PIN_ATTEMPTS) {
      const until = new Date(Date.now() + PIN_LOCK_MINUTES * 60 * 1000);
      await query(
        `UPDATE users SET pin_failed_attempts = 0, pin_locked_until = $2, updated_at = now() WHERE id = $1`,
        [userId, until]
      );
      await logAudit(userId, "pin_locked", "user", userId, { minutes: PIN_LOCK_MINUTES });
      throw new PinLockedError(until);
    }
    throw new IncorrectPinError();
  }

  // Success clears any accumulated failures / stale lock.
  await query(
    `UPDATE users SET pin_failed_attempts = 0, pin_locked_until = NULL, updated_at = now()
     WHERE id = $1 AND (pin_failed_attempts <> 0 OR pin_locked_until IS NOT NULL)`,
    [userId]
  );
}

// Self-service PIN change — requires the current PIN, unlike resetPin()
// below which is an admin/support action that clears it outright. This is
// the "I know my PIN and want a new one" path; that one is "I forgot it."
export async function changePin(userId: string, currentPin: string, newPin: string): Promise<void> {
  await verifyPin(userId, currentPin); // throws PinNotSetError / IncorrectPinError / InvalidPinFormatError
  if (!PIN_PATTERN.test(newPin)) throw new InvalidPinFormatError();

  const hash = await bcrypt.hash(newPin, 10);
  await query(`UPDATE users SET pin_hash = $2, updated_at = now() WHERE id = $1`, [userId, hash]);
  await logAudit(userId, "pin_changed", "user", userId);
}

// Admin/support action: clears a customer's transaction PIN (e.g. they
// forgot it, or it may be compromised). The user is prompted to set a new
// one the next time they try to authorize a purchase — the same flow a
// brand-new account goes through, never a direct admin-set PIN.
export async function resetPin(userId: string, actorAdminId: string): Promise<void> {
  await query(`UPDATE users SET pin_hash = NULL, updated_at = now() WHERE id = $1`, [userId]);
  await logAudit(actorAdminId, "pin_reset_by_admin", "user", userId);
}
