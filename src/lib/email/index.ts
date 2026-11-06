import type { EmailSender } from "./types";
import { resendEmailSender } from "./resend";

export const emailSender: EmailSender = resendEmailSender;

export function isEmailDeliveryConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
