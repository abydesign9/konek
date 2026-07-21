import crypto from "node:crypto";
import path from "node:path";
import {
  mkdir,
  readFile,
  unlink,
  writeFile,
} from "node:fs/promises";
import {
  decryptPii,
  encryptPii,
  type EncryptedEnvelope,
} from "@/lib/crypto/pii";

const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

export type SupportedDocumentMime =
  | "application/pdf"
  | "image/jpeg"
  | "image/png";

export interface StoredDocument {
  storageKey: string;
  mimeType: SupportedDocumentMime;
  sizeBytes: number;
}

function storageRoot(): string {
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.KYC_DOCUMENT_STORAGE_DIR
  ) {
    throw new Error(
      "KYC_DOCUMENT_STORAGE_DIR must be configured in production"
    );
  }

  return (
    process.env.KYC_DOCUMENT_STORAGE_DIR ??
    path.join(process.cwd(), ".data", "kyc-documents")
  );
}

function safeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function aad(userId: string, storageKey: string): string {
  return `kyc_document:${userId}:${storageKey}`;
}

function detectMimeType(
  bytes: Buffer
): SupportedDocumentMime | null {
  if (
    bytes.length >= 5 &&
    bytes.subarray(0, 5).toString("ascii") === "%PDF-"
  ) {
    return "application/pdf";
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(
      Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
      ])
    )
  ) {
    return "image/png";
  }

  return null;
}

function resolveStoragePath(storageKey: string): string {
  if (
    path.isAbsolute(storageKey) ||
    storageKey.includes("..")
  ) {
    throw new Error("Invalid KYC document storage key");
  }

  const root = storageRoot();
  const resolved = path.resolve(root, storageKey);
  const resolvedRoot = path.resolve(root);

  if (
    resolved !== resolvedRoot &&
    !resolved.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    throw new Error("Invalid KYC document storage path");
  }

  return resolved;
}

export async function storePrivateDocument({
  userId,
  bytes,
}: {
  userId: string;
  bytes: Buffer;
}): Promise<StoredDocument> {
  if (bytes.length === 0) {
    throw new Error("Uploaded document is empty");
  }

  if (bytes.length > MAX_DOCUMENT_BYTES) {
    throw new Error("Each document must be 8 MB or smaller");
  }

  const mimeType = detectMimeType(bytes);

  if (!mimeType) {
    throw new Error(
      "Only PDF, JPEG and PNG documents are supported"
    );
  }

  const userDirectory = safeUserId(userId);
  const storageKey =
    `${userDirectory}/${crypto.randomUUID()}.json`;

  const fullPath = resolveStoragePath(storageKey);

  await mkdir(path.dirname(fullPath), {
    recursive: true,
    mode: 0o700,
  });

  const encrypted = encryptPii(
    bytes.toString("base64"),
    aad(userId, storageKey)
  );

  await writeFile(
    fullPath,
    JSON.stringify(encrypted),
    {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    }
  );

  return {
    storageKey,
    mimeType,
    sizeBytes: bytes.length,
  };
}

export async function readPrivateDocument({
  userId,
  storageKey,
}: {
  userId: string;
  storageKey: string;
}): Promise<Buffer> {
  const fullPath = resolveStoragePath(storageKey);
  const raw = await readFile(fullPath, "utf8");

  const envelope =
    JSON.parse(raw) as EncryptedEnvelope;

  const plaintext = decryptPii(
    envelope,
    aad(userId, storageKey)
  );

  return Buffer.from(plaintext, "base64");
}

export async function deletePrivateDocument(
  storageKey: string
): Promise<void> {
  try {
    await unlink(resolveStoragePath(storageKey));
  } catch (error) {
    const code =
      error &&
      typeof error === "object" &&
      "code" in error
        ? String(error.code)
        : "";

    if (code !== "ENOENT") {
      throw error;
    }
  }
}
