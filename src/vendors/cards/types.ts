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

// Full card number/expiry/CVV. A real issuer never stores the PAN in our DB —
// it's fetched on demand from the issuer's secure vault (PCI scope stays with
// them). We mirror that: nothing sensitive is persisted; reveal calls this.
export interface SensitiveCardDetails {
  pan: string;
  expMonth: number;
  expYear: number;
  cvv: string;
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
  getSensitiveDetails(providerCardId: string): Promise<SensitiveCardDetails>;
}
