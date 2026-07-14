import crypto from "node:crypto";
import { IdentityVerifyResult, KycAdapter, LivenessVerifyResult } from "./types";

// Stands in for Dojah in dev/CI. Deterministic so tests and demos are
// predictable, but shaped exactly like a real verification response so the
// service layer needs zero changes when a live provider is wired in.
//
// Rules:
//  - BVN/NIN: an 11-digit numeric string passes; anything else fails.
//  - Liveness: passes, and reports a duplicate face if the same normalized
//    imageRef has been seen for a *different* user before (a stand-in for the
//    provider's face-match/1:N dedupe).

const seenFaces = new Map<string, string>(); // imageRef -> first userId that used it

// Exposed so tests can simulate "this selfie already belongs to someone else".
export function registerKnownFace(imageRef: string, userId: string) {
  seenFaces.set(imageRef, userId);
}

function isElevenDigits(value: string): boolean {
  return /^\d{11}$/.test(value);
}

export const mockDojahAdapter: KycAdapter = {
  id: "mock_dojah",

  async verifyIdentity({ type, value, userId }): Promise<IdentityVerifyResult> {
    const vendorRef = `dojah_${type}_${crypto.randomUUID().slice(0, 8)}`;
    const pass = isElevenDigits(value);
    return {
      result: pass ? "pass" : "fail",
      vendorRef,
      reason: pass ? undefined : `${type.toUpperCase()} must be 11 digits`,
      raw: { userId, type, matched: pass, provider: "mock_dojah" },
    };
  },

  async verifyLiveness({ userId, imageRef }): Promise<LivenessVerifyResult> {
    const vendorRef = `dojah_liveness_${crypto.randomUUID().slice(0, 8)}`;
    const ref = imageRef ?? `selfie_${userId}`;
    const owner = seenFaces.get(ref);
    const duplicate = owner !== undefined && owner !== userId;
    if (!duplicate) seenFaces.set(ref, userId);
    return {
      result: duplicate ? "fail" : "pass",
      duplicate,
      vendorRef,
      reason: duplicate ? "This face is already linked to another account" : undefined,
      raw: { userId, imageRef: ref, duplicate, provider: "mock_dojah" },
    };
  },
};
