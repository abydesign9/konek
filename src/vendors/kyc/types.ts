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
