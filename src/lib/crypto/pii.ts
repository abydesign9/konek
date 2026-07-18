import crypto from "node:crypto";

// ============================================================================
// Platform PII envelope encryption (AES-256-GCM).
//
// This is the standard for storing sensitive PII at rest across KONEK (KYC
// provider payloads, and any other regulated personal data). Do not store such
// payloads in plaintext — encrypt with encryptPii() and keep only the minimal
// operational fields (provider, reference, status, etc.) in plaintext columns.
//
// Envelope model:
//   * a fresh 256-bit Data Encryption Key (DEK) is generated per record and
//     used to encrypt the payload (AES-256-GCM);
//   * the DEK is then wrapped (encrypted) under the master key, also AES-256-GCM;
//   * only the wrapped DEK travels with the ciphertext — the master key never
//     touches the database.
// This mirrors a KMS envelope scheme so swapping the master key for a real KMS
// (AWS KMS / GCP KMS) later is a change to getMasterKey() alone, not the format.
//
// The master key comes from PII_MASTER_KEY (base64-encoded 32 bytes). Generate
// one with:  openssl rand -base64 32
// ============================================================================

const ALG = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit nonce, the GCM standard
const KEY_BYTES = 32; // 256-bit
const VERSION = 1;

export interface EncryptedEnvelope {
  v: number; // format version, for future key-rotation / algorithm migration
  alg: "aes-256-gcm";
  iv: string; // base64 — payload nonce
  tag: string; // base64 — payload auth tag
  ct: string; // base64 — payload ciphertext
  dek: {
    iv: string; // base64 — DEK-wrap nonce
    tag: string; // base64 — DEK-wrap auth tag
    ct: string; // base64 — wrapped (encrypted) DEK
  };
}

export class PiiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PiiKeyError";
  }
}

// Read at call time (not import time) so tests and key rotation can set it
// without reloading the module.
function getMasterKey(): Buffer {
  const raw = process.env.PII_MASTER_KEY;
  if (!raw) throw new PiiKeyError("Missing PII_MASTER_KEY env var");
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new PiiKeyError(`PII_MASTER_KEY must decode to ${KEY_BYTES} bytes (got ${key.length})`);
  }
  return key;
}

function gcmEncrypt(key: Buffer, plaintext: Buffer, aad?: string) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  if (aad) cipher.setAAD(Buffer.from(aad, "utf8"));
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { iv, tag: cipher.getAuthTag(), ct };
}

function gcmDecrypt(key: Buffer, iv: Buffer, tag: Buffer, ct: Buffer, aad?: string): Buffer {
  const decipher = crypto.createDecipheriv(ALG, key, iv);
  if (aad) decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

// Encrypts an arbitrary payload. `aad` (additional authenticated data) binds the
// ciphertext to a context — e.g. `kyc_checks:<userId>` — so a blob can't be
// silently lifted from one record to another; the same aad must be supplied to
// decrypt.
export function encryptPii(plaintext: string, aad?: string): EncryptedEnvelope {
  const master = getMasterKey();
  const dek = crypto.randomBytes(KEY_BYTES);

  const payload = gcmEncrypt(dek, Buffer.from(plaintext, "utf8"), aad);
  const wrapped = gcmEncrypt(master, dek, aad);

  return {
    v: VERSION,
    alg: ALG,
    iv: payload.iv.toString("base64"),
    tag: payload.tag.toString("base64"),
    ct: payload.ct.toString("base64"),
    dek: {
      iv: wrapped.iv.toString("base64"),
      tag: wrapped.tag.toString("base64"),
      ct: wrapped.ct.toString("base64"),
    },
  };
}

export function decryptPii(env: EncryptedEnvelope, aad?: string): string {
  if (env.v !== VERSION) throw new PiiKeyError(`Unsupported envelope version ${env.v}`);
  const master = getMasterKey();

  const dek = gcmDecrypt(
    master,
    Buffer.from(env.dek.iv, "base64"),
    Buffer.from(env.dek.tag, "base64"),
    Buffer.from(env.dek.ct, "base64"),
    aad
  );

  const plaintext = gcmDecrypt(
    dek,
    Buffer.from(env.iv, "base64"),
    Buffer.from(env.tag, "base64"),
    Buffer.from(env.ct, "base64"),
    aad
  );
  return plaintext.toString("utf8");
}

// Convenience for JSON payloads (the common case for provider responses).
export function encryptJson(value: unknown, aad?: string): EncryptedEnvelope {
  return encryptPii(JSON.stringify(value), aad);
}

export function decryptJson<T = unknown>(env: EncryptedEnvelope, aad?: string): T {
  return JSON.parse(decryptPii(env, aad)) as T;
}
