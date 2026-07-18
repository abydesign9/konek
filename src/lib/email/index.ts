import type { EmailSender } from "./types";
import { resendEmailSender } from "./resend";
import { mockEmailSender } from "./mock";

// Use Resend when a key is configured; otherwise fall back to the mock (which
// logs and lets the OTP flow be tested via the request route's demo response).
export const emailSender: EmailSender = process.env.RESEND_API_KEY ? resendEmailSender : mockEmailSender;

export function isEmailDeliveryConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
