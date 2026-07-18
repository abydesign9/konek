// Provider-agnostic email sender — same pattern as the SMS sender. Swap the
// implementation (Resend today) without touching callers.
export interface EmailSender {
  id: string;
  send(to: string, subject: string, html: string, text?: string): Promise<{ vendorRef: string }>;
  sendOtp(to: string, code: string): Promise<{ vendorRef: string }>;
}
