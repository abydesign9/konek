import { AuthorizeResult, CardIssuerAdapter, IssueCardResult, SensitiveCardDetails, ThreeDsResult } from "./types";

function randomDigits(n: number): string {
  let out = "";
  for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10);
  return out;
}

// The correct OTP for a mock challenge is deterministic from its id, so a
// test/dev flow can complete 3DS without a real SMS provider — but the
// wrong code always fails, same as a real challenge would.
function expectedOtpFor(challengeId: string): string {
  const seed = challengeId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return String(seed % 1_000_000).padStart(6, "0");
}

export const expectedOtpForChallenge = expectedOtpFor;

export const mockSudoAdapter: CardIssuerAdapter = {
  id: "mock_sudo",

  async issueCard(): Promise<IssueCardResult> {
    return {
      providerCardId: `sudo_card_${randomDigits(12)}`,
      brand: "visa",
      last4: randomDigits(4),
    };
  },

  async authorize(): Promise<AuthorizeResult> {
    return {
      providerRef: `sudo_auth_${randomDigits(10)}`,
      threeDsChallengeId: `3ds_${crypto.randomUUID()}`,
    };
  },

  async completeThreeDs(threeDsChallengeId: string, code: string): Promise<ThreeDsResult> {
    return { passed: code === expectedOtpFor(threeDsChallengeId) };
  },

  // Deterministic from the provider card id so reveal is stable across calls
  // without persisting the PAN. A real issuer returns these from its vault.
  async getSensitiveDetails(providerCardId: string): Promise<SensitiveCardDetails> {
    const seed = providerCardId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    let digits = "";
    for (let i = 0; i < 15; i++) digits += ((seed * (i + 7) + i * 31) % 10).toString();
    const pan = "4" + digits; // 16-digit Visa-style
    const expMonth = (seed % 12) + 1;
    const expYear = 2029 + (seed % 3);
    const cvv = String((seed * 13) % 1000).padStart(3, "0");
    return { pan, expMonth, expYear, cvv };
  },
};
