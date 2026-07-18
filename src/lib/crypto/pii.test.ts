import { describe, expect, it, beforeAll } from "vitest";
import { encryptPii, decryptPii, encryptJson, decryptJson, PiiKeyError, EncryptedEnvelope } from "./pii";

describe("pii envelope encryption", () => {
  beforeAll(() => {
    process.env.PII_MASTER_KEY = Buffer.alloc(32, 3).toString("base64");
  });

  it("round-trips a string", () => {
    const secret = "BVN:12345678901";
    const env = encryptPii(secret);
    expect(env.alg).toBe("aes-256-gcm");
    expect(JSON.stringify(env)).not.toContain(secret); // ciphertext leaks nothing
    expect(decryptPii(env)).toBe(secret);
  });

  it("round-trips JSON", () => {
    const payload = { userId: "u1", nin: "12345678901", matched: true };
    const env = encryptJson(payload);
    expect(decryptJson(env)).toEqual(payload);
  });

  it("uses a fresh DEK/nonce per call (ciphertexts differ)", () => {
    const a = encryptPii("same");
    const b = encryptPii("same");
    expect(a.ct).not.toBe(b.ct);
    expect(a.dek.ct).not.toBe(b.dek.ct);
  });

  it("rejects a tampered ciphertext (GCM auth tag)", () => {
    const env = encryptPii("sensitive");
    const bad: EncryptedEnvelope = { ...env, ct: Buffer.from("deadbeef", "hex").toString("base64") };
    expect(() => decryptPii(bad)).toThrow();
  });

  it("enforces the aad binding — wrong context fails to decrypt", () => {
    const env = encryptPii("sensitive", "kyc_checks:userA");
    expect(decryptPii(env, "kyc_checks:userA")).toBe("sensitive");
    expect(() => decryptPii(env, "kyc_checks:userB")).toThrow();
  });

  it("throws PiiKeyError on a missing/short master key", () => {
    const saved = process.env.PII_MASTER_KEY;
    process.env.PII_MASTER_KEY = "";
    expect(() => encryptPii("x")).toThrow(PiiKeyError);
    process.env.PII_MASTER_KEY = Buffer.alloc(16, 1).toString("base64"); // too short
    expect(() => encryptPii("x")).toThrow(PiiKeyError);
    process.env.PII_MASTER_KEY = saved;
  });
});
