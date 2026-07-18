import { describe, expect, it, vi, beforeEach } from "vitest";

// Mocked DB: a single mutable user row the queries read/write, so we can drive
// the lockout state machine without a real Postgres.
let row: { pin_hash: string | null; pin_locked_until: string | null; pin_failed_attempts: number };

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => {}) }));

vi.mock("@/lib/db", () => ({
  query: vi.fn(async (text: string) => {
    if (text.includes("SELECT pin_hash, pin_locked_until")) {
      return { rows: [{ pin_hash: row.pin_hash, pin_locked_until: row.pin_locked_until }] };
    }
    if (text.includes("pin_failed_attempts = pin_failed_attempts + 1")) {
      row.pin_failed_attempts += 1;
      return { rows: [{ attempts: row.pin_failed_attempts }] };
    }
    if (text.includes("pin_locked_until = $2")) {
      row.pin_locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      row.pin_failed_attempts = 0;
      return { rows: [] };
    }
    if (text.includes("pin_failed_attempts = 0, pin_locked_until = NULL")) {
      row.pin_failed_attempts = 0;
      row.pin_locked_until = null;
      return { rows: [] };
    }
    throw new Error(`unexpected query: ${text}`);
  }),
}));

const bcrypt = (await import("bcryptjs")).default;
const { verifyPin, IncorrectPinError, PinLockedError, PinNotSetError } = await import("./pin");

describe("verifyPin lockout", () => {
  beforeEach(async () => {
    row = { pin_hash: await bcrypt.hash("1234", 10), pin_locked_until: null, pin_failed_attempts: 0 };
  });

  it("accepts the correct PIN and clears any prior failures", async () => {
    row.pin_failed_attempts = 2;
    await expect(verifyPin("u1", "1234")).resolves.toBeUndefined();
    expect(row.pin_failed_attempts).toBe(0);
  });

  it("throws PinNotSetError when no PIN is set", async () => {
    row.pin_hash = null;
    await expect(verifyPin("u1", "1234")).rejects.toBeInstanceOf(PinNotSetError);
  });

  it("locks the account after 5 wrong attempts", async () => {
    for (let i = 0; i < 4; i++) {
      await expect(verifyPin("u1", "0000")).rejects.toBeInstanceOf(IncorrectPinError);
    }
    // 5th wrong attempt trips the lock
    await expect(verifyPin("u1", "0000")).rejects.toBeInstanceOf(PinLockedError);
    expect(row.pin_locked_until).not.toBeNull();
  });

  it("refuses even the correct PIN while locked", async () => {
    row.pin_locked_until = new Date(Date.now() + 60_000).toISOString();
    await expect(verifyPin("u1", "1234")).rejects.toBeInstanceOf(PinLockedError);
  });
});
