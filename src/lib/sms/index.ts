import type { SmsSender } from "./types";
import { mockSmsSender } from "./mock";

// TERMII_API_KEY unset in this phase -> always mock. Once the key lands,
// branch here to a TermiiSmsSender that implements the same interface.
export const smsSender: SmsSender = mockSmsSender;
