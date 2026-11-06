import type { SmsSender } from "./types";

export const smsSender: SmsSender = {
  async sendOtp(phone: string, code: string) {
    if (!process.env.TERMII_API_KEY) {
      throw new Error("Missing TERMII_API_KEY env var");
    }
    throw new Error("SMS provider not implemented yet");
  },
};
