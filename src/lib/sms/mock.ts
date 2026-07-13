import type { SmsSender } from "./types";

// Logs the OTP instead of sending a real SMS. Swap for the Termii adapter
// once TERMII_API_KEY is live (same SmsSender interface).
export const mockSmsSender: SmsSender = {
  async sendOtp(phone, code) {
    console.log(`[mock-sms] OTP for ${phone}: ${code}`);
    return { vendorRef: `mock_${Date.now()}` };
  },
};
