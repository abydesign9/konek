import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

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
