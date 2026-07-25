import crypto from "node:crypto";
import type { MethodKycAdapter, MethodVerifyInput, MethodVerifyResult } from "./types";
import { smileIdAdapter } from "./smileId";

// Method-based KYC adapters, keyed by kyc_providers.adapter_key. Mocks ship so
// the global flow works end-to-end before any real vendor key exists; a real
// provider (Smile ID, Sumsub, Onfido, QoreID...) is added here as one more
// entry and switched on via a kyc_providers row — no service change.

const NUMBER_LOOKUP: Record<string, RegExp> = {
  bvn: /^\d{11}$/,
  nin: /^\d{11}$/,
  ssn_last4: /^\d{4}$/,
  aadhaar: /^\d{12}$/,
};

// Shared 1:N face store for the biometric mock (same idea as mockDojah).
const seenFaces = new Map<string, string>();
export function registerKnownFace(imageRef: string, userId: string) {
  seenFaces.set(imageRef, userId);
}

function ref(provider: string, method: string) {
  return `${provider}_${method}_${crypto.randomUUID().slice(0, 8)}`;
}

function verifyBiometric(provider: string, input: MethodVerifyInput): MethodVerifyResult {
  const key = input.imageRef ?? `selfie_${input.userId}`;
  const owner = seenFaces.get(key);
  const duplicate = owner !== undefined && owner !== input.userId;
  if (!duplicate) seenFaces.set(key, input.userId);
  return {
    result: duplicate ? "fail" : "pass",
    duplicate,
    vendorRef: ref(provider, input.method),
    reason: duplicate ? "This face is already linked to another account" : undefined,
    raw: { userId: input.userId, method: input.method, duplicate, provider },
  };
}

function verifyGeneric(provider: string, input: MethodVerifyInput): MethodVerifyResult {
  if (input.method === "selfie_liveness") return verifyBiometric(provider, input);

  const pattern = NUMBER_LOOKUP[input.method];
  if (pattern) {
    const pass = typeof input.value === "string" && pattern.test(input.value);
    return {
      result: pass ? "pass" : "fail",
      vendorRef: ref(provider, input.method),
      reason: pass ? undefined : `${input.method.toUpperCase()} format is invalid`,
      raw: { userId: input.userId, method: input.method, matched: pass, provider },
    };
  }

  // Document / address methods: a reference must be supplied (an uploaded file).
  const supplied = Boolean(input.documentRef || input.imageRef);
  return {
    result: supplied ? "pass" : "fail",
    vendorRef: ref(provider, input.method),
    reason: supplied ? undefined : "A document image is required",
    raw: { userId: input.userId, method: input.method, provider, documentRef: input.documentRef ?? null },
  };
}

const mockDojah: MethodKycAdapter = {
  key: "mock_dojah",
  async verify(input) {
    return verifyGeneric("mock_dojah", input);
  },
};

const mockGlobal: MethodKycAdapter = {
  key: "mock_global",
  async verify(input) {
    return verifyGeneric("mock_global", input);
  },
};

const ADAPTERS: Record<string, MethodKycAdapter> = {
  mock_dojah: mockDojah,
  mock_global: mockGlobal,
  smile_id: smileIdAdapter,
};

export function getMethodAdapter(adapterKey: string): MethodKycAdapter | null {
  return ADAPTERS[adapterKey] ?? null;
}
