import { InitializeParams, InitializeResult, PaymentGateway, VerifyResult } from "./types";

const BASE_URL = "https://api.paystack.co";

function authHeaders() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("Missing PAYSTACK_SECRET_KEY env var");
  return { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
}

export const paystackGateway: PaymentGateway = {
  async initialize(params: InitializeParams): Promise<InitializeResult> {
    const res = await fetch(`${BASE_URL}/transaction/initialize`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        email: params.email,
        amount: params.amountMinor,
        currency: params.currency,
        reference: params.reference,
        callback_url: params.callbackUrl,
      }),
    });
    if (!res.ok) throw new Error(`Paystack initialize failed: ${res.status}`);
    const data = await res.json();
    return { authorizationUrl: data.data.authorization_url, reference: data.data.reference };
  },

  async verifyTransaction(reference: string): Promise<VerifyResult> {
    const res = await fetch(`${BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Paystack verify failed: ${res.status}`);
    const data = await res.json();
    const status = data.data.status === "success" ? "success" : "failed";
    return { status, amountMinor: data.data.amount, currency: data.data.currency };
  },
};
