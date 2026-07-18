import { EmailSender } from "./types";

// Fallback when RESEND_API_KEY isn't set — logs instead of sending. The email
// OTP request route surfaces the code in its response in this mode so the flow
// is testable before a real key is configured.
export const mockEmailSender: EmailSender = {
  id: "mock_email",
  async send(to, subject) {
    console.log(`[mock-email] to ${to}: ${subject}`);
    return { vendorRef: "mock" };
  },
  async sendOtp(to, code) {
    console.log(`[mock-email:otp] to ${to}: ${code}`);
    return { vendorRef: "mock" };
  },
};
