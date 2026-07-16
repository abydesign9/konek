import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const PIN_PATTERN = /^\d{4,6}$/;

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

  const { rows } = await query<{ pin_hash: string | null }>(
    `SELECT pin_hash FROM users WHERE id = $1`,
    [userId]
  );
  const hash = rows[0]?.pin_hash;
  if (!hash) throw new PinNotSetError();

  const ok = await bcrypt.compare(pin, hash);
  if (!ok) throw new IncorrectPinError();
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
