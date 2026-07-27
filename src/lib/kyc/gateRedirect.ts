// Money-movement APIs reject an under-verified user with a 403 carrying
// { code: "kyc_tier_too_low" } (see src/lib/kyc/tiers.ts KycGateError). Rather
// than surfacing that raw message in a form, buy/fund flows call this to send
// the user straight into the country-aware verification flow — tap → verify,
// the way 1App gates its money features. Returns true when it handled the
// response (the caller should stop, a redirect is under way).
export function redirectIfKycGate(res: Response, data: unknown): boolean {
  const code = (data as { code?: string } | null)?.code;
  if (res.status === 403 && code === "kyc_tier_too_low") {
    if (typeof window !== "undefined") window.location.href = "/kyc";
    return true;
  }
  return false;
}
