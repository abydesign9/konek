import crypto from "node:crypto";
import { resilientRequest } from "@/lib/http/resilientHttp";
import type { MethodKycAdapter, MethodVerifyInput, MethodVerifyResult } from "./types";

// SmileID KYC adapter (Africa: NG, GH, KE, ZA, ...). Registered under adapter_key
// 'smile_id' and used when a kyc_providers row points to it AND the SmileID env
// keys are set; otherwise the mock adapters handle verification. Follows
// SmileID's documented signature + job API shape.
//
// It must be validated against a SmileID SANDBOX account before go-live (set the
// keys, run a test job), which cannot be done here without credentials. On a
// mismatched/fraudulent result it returns fraud:true, which freezes the account.

export function smileIdConfigured(): boolean {
  return Boolean(process.env.SMILEID_PARTNER_ID && process.env.SMILEID_API_KEY);
}

function base(): string {
  // SmileID sandbox vs production base URLs.
  return process.env.SMILEID_BASE_URL || "https://testapi.smileidentity.com/v1";
}

// SmileID signature: base64(HMAC-SHA256(timestamp + partnerId + "sid_request", apiKey)).
function signature(timestamp: string): string {
  const partnerId = process.env.SMILEID_PARTNER_ID as string;
  const apiKey = process.env.SMILEID_API_KEY as string;
  const hmac = crypto.createHmac("sha256", apiKey);
  hmac.update(timestamp).update(partnerId).update("sid_request");
  return hmac.digest("base64");
}

// SmileID id_type codes per country for the ID methods we support.
function idType(country: string, method: string): string | null {
  const c = country.toUpperCase();
  if (method === "bvn") return "BVN";
  if (method === "nin") return c === "NG" ? "NIN_V2" : null;
  if (method === "national_id") return c === "GH" ? "GHANA_CARD" : c === "KE" ? "NATIONAL_ID" : "NATIONAL_ID";
  if (method === "passport") return "PASSPORT";
  if (method === "drivers_licence") return "DRIVERS_LICENSE";
  return null;
}

export const smileIdAdapter: MethodKycAdapter = {
  key: "smile_id",

  async verify(input: MethodVerifyInput): Promise<MethodVerifyResult> {
    const vendorRef = `smileid_${input.method}_${crypto.randomUUID().slice(0, 8)}`;
    const type = idType(input.country, input.method);
    // Biometric/liveness and document uploads use SmileID's job flow; here we
    // implement the ID-number verification path (Enhanced KYC), which is the
    // most common and testable. Other methods fall back to a not-supported fail.
    if (!type || !input.value) {
      return { result: "fail", vendorRef, reason: `SmileID does not support ${input.method} for ${input.country}`, raw: { provider: "smile_id" } };
    }

    const timestamp = new Date().toISOString();
    const res = await resilientRequest({
      provider: "smile_id",
      operation: "verify",
      method: "POST",
      url: `${base()}/id_verification`,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partner_id: process.env.SMILEID_PARTNER_ID,
        timestamp,
        signature: signature(timestamp),
        country: input.country.toUpperCase(),
        id_type: type,
        id_number: input.value,
      }),
    });

    const data = res.json<{
      ResultCode?: string;
      ResultText?: string;
      Actions?: { Verify_ID_Number?: string; Names?: string };
      SmileJobID?: string;
    }>();

    // SmileID: "1012" = verified. A "mismatch" action or a rejecting result code
    // is treated as a fraud/mismatch signal (freezes the account upstream).
    const verified = data.ResultCode === "1012" || data.Actions?.Verify_ID_Number === "Verified";
    const mismatch =
      data.Actions?.Verify_ID_Number === "Not Verified" ||
      /mismatch|not match|fraud/i.test(data.ResultText ?? "");

    if (verified) {
      return { result: "pass", vendorRef: data.SmileJobID ?? vendorRef, raw: { provider: "smile_id", ...data } };
    }
    return {
      result: "fail",
      vendorRef: data.SmileJobID ?? vendorRef,
      reason: data.ResultText ?? "SmileID could not verify this ID",
      fraud: mismatch,
      raw: { provider: "smile_id", ...data },
    };
  },
};
