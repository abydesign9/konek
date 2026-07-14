export interface IssueCardResult {
  providerCardId: string;
  brand: "visa" | "mastercard";
  last4: string;
}

export interface AuthorizeResult {
  providerRef: string;
  threeDsChallengeId: string;
}

export interface ThreeDsResult {
  passed: boolean;
}

// 3-D Secure is mandatory on every authorization — this interface has no
// "settle without 3DS" path at all, by design, per the non-negotiable rule
// in the Phase 2 roadmap. A real adapter (Sudo/Union54/Stripe Issuing)
// implements the same shape; the challenge step can never be skipped.
export interface CardIssuerAdapter {
  id: string;
  issueCard(userId: string): Promise<IssueCardResult>;
  authorize(providerCardId: string, amountMinor: number, merchantName: string): Promise<AuthorizeResult>;
  completeThreeDs(threeDsChallengeId: string, code: string): Promise<ThreeDsResult>;
}
