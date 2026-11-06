import { resilientRequest } from "@/lib/http/resilientHttp";
import { EmailSender } from "./types";

// Resend email sender (https://resend.com). Reads credentials from env:
//   RESEND_API_KEY   — the re_... API key from the Resend dashboard
//   RESEND_FROM      — verified sender, e.g. "raviion <no-reply@yourdomain.com>"
// Goes through the shared HTTP resilience layer (timeout/retry/metrics).
const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "raviion <onboarding@resend.dev>"; // Resend's shared test sender

function otpHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your raviion verification code</title>
</head>
<body style="margin:0; padding:0; background-color:#F0F2F7; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0F2F7; padding:32px 16px;">
    <tr>
      <td align="center">

        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background-color:#FFFFFF; border-radius:16px; overflow:hidden;">

          <!-- Header band -->
          <tr>
            <td style="background-color:#22315C; padding:28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:20px; font-weight:700; color:#FFFFFF; letter-spacing:0.2px;">raviion</span>
                  </td>
                  <td align="right">
                    <span style="font-size:12px; color:#AEB8D6; letter-spacing:0.4px; text-transform:uppercase;">One&nbsp;connected&nbsp;platform</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 32px 8px 32px;">
              <div style="width:44px; height:44px; background-color:#EDF1FF; border-radius:12px; text-align:center; line-height:44px; font-size:20px;">🔑</div>
              <h1 style="margin:20px 0 12px 0; font-size:22px; line-height:28px; color:#161B2E; font-weight:700;">
                Your verification code
              </h1>
              <p style="margin:0 0 28px 0; font-size:15px; line-height:23px; color:#555F7A;">
                Use this code to verify your identity and continue. It expires in 10 minutes, so enter it right away.
              </p>

              <!-- Code block -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="background-color:#F5F7FC; border:1px solid #E4E9F5; border-radius:12px; padding:20px 0; text-align:center;">
                    <span style="font-size:32px; font-weight:700; letter-spacing:8px; color:#22315C; font-family:'SFMono-Regular', Consolas, Menlo, monospace;">
                      ${code}
                    </span>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0 0; font-size:13px; line-height:20px; color:#8891AA;">
                Didn't request this code? You can safely ignore this email — no changes will be made to your account.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <div style="border-top:1px solid #EEF0F5;"></div>
            </td>
          </tr>

          <!-- Security note -->
          <tr>
            <td style="padding:20px 32px 32px 32px;">
              <p style="margin:0; font-size:12px; color:#9AA2B8;">
                For your security, never share this code with anyone — raviion will never ask for it.
              </p>
            </td>
          </tr>

        </table>

        <!-- Footer -->
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; margin-top:20px;">
          <tr>
            <td align="center" style="padding:0 32px;">
              <p style="margin:0 0 6px 0; font-size:12px; color:#9AA2B8;">
                raviion · Digital access without borders
              </p>
              <p style="margin:0; font-size:12px; color:#9AA2B8;">
                <a href="mailto:support@raviion.app" style="color:#9AA2B8; text-decoration:underline;">support@raviion.app</a>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
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
    return this.send(to, "Your raviion verification code", otpHtml(code), `Your raviion verification code is ${code}. It expires in 10 minutes.`);
  },
};
