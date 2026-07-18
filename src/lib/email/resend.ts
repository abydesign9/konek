import { resilientRequest } from "@/lib/http/resilientHttp";
import { EmailSender } from "./types";

// Resend email sender (https://resend.com). Reads credentials from env:
//   RESEND_API_KEY   — the re_... API key from the Resend dashboard
//   RESEND_FROM      — verified sender, e.g. "Konek <no-reply@yourdomain.com>"
// Goes through the shared HTTP resilience layer (timeout/retry/metrics).
const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "Konek <onboarding@resend.dev>"; // Resend's shared test sender

function otpHtml(code: string): string {
  return `
  <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
    <h2 style="color:#1F3864;margin:0 0 8px">Your Konek verification code</h2>
    <p style="color:#555;margin:0 0 20px">Enter this code to continue. It expires in 10 minutes.</p>
    <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#1F3864;background:#F7F8FA;border-radius:12px;padding:16px 0;text-align:center">${code}</div>
    <p style="color:#999;font-size:12px;margin:20px 0 0">If you didn't request this, you can ignore this email.</p>
  </div>`;
}

export const resendEmailSender: EmailSender = {
  id: "resend",

  async send(to, subject, html, text) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("Missing RESEND_API_KEY env var");
    const res = await resilientRequest({
      provider: "resend",
      operation: "other",
      url: RESEND_URL,
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.RESEND_FROM ?? DEFAULT_FROM, to, subject, html, text }),
    });
    const data = res.json<{ id?: string }>();
    return { vendorRef: data.id ?? "" };
  },

  async sendOtp(to, code) {
    return this.send(to, "Your Konek verification code", otpHtml(code), `Your Konek verification code is ${code}. It expires in 10 minutes.`);
  },
};
