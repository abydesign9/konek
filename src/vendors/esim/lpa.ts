// SM-DP+ / LPA activation helpers. Real eSIM activation uses the LPA format the
// phone camera expects: LPA:1$<smdp-address>$<matching-id>. Provider-agnostic.

const DEFAULT_SMDP = process.env.ESIM_DEFAULT_SMDP ?? "smdp.konek.app";

export function lpaString(smdpAddress: string, matchingId: string): string {
  return `LPA:1$${smdpAddress}$${matchingId}`;
}

// The QR payload is, by the GSMA spec, the LPA string itself.
export function lpaQrPayload(smdpAddress: string, matchingId: string): string {
  return lpaString(smdpAddress, matchingId);
}

export function defaultSmdpAddress(): string {
  return DEFAULT_SMDP;
}
