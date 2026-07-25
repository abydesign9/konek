import { resilientRequest } from "@/lib/http/resilientHttp";
import { CreateNgnAccountResult, NgnAccountAdapter, NgnInflowVerifyResult } from "./types";

// Real Monnify reserved-account adapter. Registers only when MONNIFY_API_KEY,
// MONNIFY_SECRET_KEY and MONNIFY_CONTRACT_CODE are set; otherwise the mock is
// used. Money is always re-fetched from Monnify's transaction endpoint on a
// webhook — the callback body is never trusted for the amount.
//
// NOTE: this follows Monnify's documented v1 auth + v2 reserved-account/
// transaction API. It must be validated against a Monnify SANDBOX account
// before going live (set the keys, provision a test account, simulate an
// inflow), which cannot be done without those credentials.

function base(): string {
  return process.env.MONNIFY_BASE_URL || "https://sandbox.monnify.com";
}

async function accessToken(): Promise<string> {
  const auth = Buffer.from(`${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`).toString("base64");
  const res = await resilientRequest({
    provider: "monnify",
    operation: "other",
    method: "POST",
    url: `${base()}/api/v1/auth/login`,
    headers: { Authorization: `Basic ${auth}` },
  });
  const data = res.json<{ responseBody?: { accessToken?: string } }>();
  const token = data.responseBody?.accessToken;
  if (!token) throw new Error("Monnify auth failed");
  return token;
}

export const monnifyAdapter: NgnAccountAdapter = {
  id: "monnify",

  async createAccount({ userId, name, email, bvn }): Promise<CreateNgnAccountResult> {
    const token = await accessToken();
    const res = await resilientRequest({
      provider: "monnify",
      operation: "other",
      method: "POST",
      url: `${base()}/api/v2/bank-transfer/reserved-accounts`,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        accountReference: `konek_${userId}`,
        accountName: name || "Konek User",
        currencyCode: "NGN",
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        customerEmail: email,
        customerName: name || "Konek User",
        bvn,
        getAllAvailableBanks: false,
      }),
    });
    const rb = res.json<{
      responseBody?: { accountReference?: string; accounts?: { accountNumber: string; bankName: string }[]; accountNumber?: string; bankName?: string };
    }>().responseBody;
    const first = rb?.accounts?.[0];
    const accountNumber = first?.accountNumber ?? rb?.accountNumber;
    const bankName = first?.bankName ?? rb?.bankName;
    if (!rb?.accountReference || !accountNumber || !bankName) throw new Error("Monnify reserved-account response incomplete");
    return { providerRef: rb.accountReference, accountNumber, bankName };
  },

  async verifyInflow(inflowRef: string): Promise<NgnInflowVerifyResult> {
    const token = await accessToken();
    const res = await resilientRequest({
      provider: "monnify",
      operation: "verify",
      method: "GET",
      url: `${base()}/api/v2/transactions/${encodeURIComponent(inflowRef)}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    const rb = res.json<{
      responseBody?: {
        paymentStatus?: string;
        amountPaid?: number;
        accountReference?: string;
        customer?: { name?: string };
        paymentSourceInformation?: { sender?: string; bankName?: string }[];
      };
    }>().responseBody;

    if (!rb || rb.paymentStatus !== "PAID") {
      return { status: "not_found", accountProviderRef: "", amountMinor: 0, senderName: "", senderBank: "" };
    }
    const src = rb.paymentSourceInformation?.[0];
    return {
      status: "received",
      accountProviderRef: rb.accountReference ?? "",
      amountMinor: Math.round((rb.amountPaid ?? 0) * 100), // Naira -> kobo
      senderName: src?.sender ?? rb.customer?.name ?? "",
      senderBank: src?.bankName ?? "",
    };
  },
};
