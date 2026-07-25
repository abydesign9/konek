// KYC vendor behind the same adapter pattern as VTU/cards/dollar-account.
// Real providers (Dojah primary, Smile ID / Youverify backup) drop in here
// without the service layer changing. The service never talks to a vendor
// SDK directly — always through this interface.

export type IdentityType = "bvn" | "nin";

export interface IdentityVerifyResult {
  result: "pass" | "fail";
  vendorRef: string;
  raw: Record<string, unknown>;
  reason?: string;
}

export interface LivenessVerifyResult extends IdentityVerifyResult {
  // Duplicate-face detection is a first-class result, not an afterthought —
  // the spec calls it out as a mandatory fraud control for finance tiers.
  duplicate: boolean;
}

export interface KycAdapter {
  id: string;
  verifyIdentity(input: {
    type: IdentityType;
    value: string;
    userId: string;
  }): Promise<IdentityVerifyResult>;
  verifyLiveness(input: { userId: string; imageRef?: string }): Promise<LivenessVerifyResult>;
}

// Generalized, method-based verification used by the global KYC engine. A
// provider is routed by (country, method); each real vendor (Smile ID, Sumsub,
// Onfido...) implements this once and is registered as a kyc_providers row.
export interface MethodVerifyInput {
  method: string; // verification_methods.code
  country: string; // ISO2
  userId: string;
  value?: string; // for number_lookup methods (BVN, NIN, SSN...)
  imageRef?: string; // for biometric methods
  documentRef?: string; // for document methods
}

export interface MethodVerifyResult {
  result: "pass" | "fail";
  vendorRef: string;
  raw: Record<string, unknown>;
  reason?: string;
  duplicate?: boolean; // biometric 1:N dedupe hit
  fraud?: boolean; // provider flagged the identity as fraudulent/mismatched
}

export interface MethodKycAdapter {
  key: string; // matches kyc_providers.adapter_key
  verify(input: MethodVerifyInput): Promise<MethodVerifyResult>;
}
