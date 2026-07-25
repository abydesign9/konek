import { NgnAccountAdapter } from "./types";
import { mockMonnifyAdapter } from "./mockMonnify";
import { monnifyAdapter } from "./monnify";

// Use the real Monnify adapter once its credentials are set; otherwise the mock,
// so the whole NGN virtual-account flow works end to end before go-live.
export function ngnAccountAdapter(): NgnAccountAdapter {
  if (process.env.MONNIFY_API_KEY && process.env.MONNIFY_SECRET_KEY && process.env.MONNIFY_CONTRACT_CODE) {
    return monnifyAdapter;
  }
  return mockMonnifyAdapter;
}
