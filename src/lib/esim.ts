// Backwards-compatible LPA helper. The activation logic now lives in the
// provider-agnostic eSIM framework (src/vendors/esim/lpa.ts); this keeps the
// original single-argument signature working for existing callers by treating
// the token as the matching id against the default SM-DP+ address.
import { defaultSmdpAddress, lpaString } from "@/vendors/esim/lpa";

export function esimLpaString(token: string): string {
  return lpaString(defaultSmdpAddress(), token);
}
