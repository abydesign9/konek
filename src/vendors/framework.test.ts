import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { ApiKeyHeaderSigner, BearerTokenSigner, HmacBodySigner, CompositeSigner, OutboundRequest } from "./signing";
import { HmacWebhookVerifier } from "./webhookVerification";
import { normalizePlan, normalizePlans, toMinor } from "./catalogNormalization";
import { VendorError, dispositionFor } from "./errors";

const baseReq = (): OutboundRequest => ({ method: "POST", url: "https://x/api", headers: {}, body: '{"a":1}' });

describe("request signing", () => {
  it("adds an api-key header with optional prefix", () => {
    const r = new ApiKeyHeaderSigner("X-Api-Key", "secret", "Key ").sign(baseReq());
    expect(r.headers["X-Api-Key"]).toBe("Key secret");
  });
  it("adds a bearer token", () => {
    expect(new BearerTokenSigner("tok").sign(baseReq()).headers.Authorization).toBe("Bearer tok");
  });
  it("signs the body with HMAC", () => {
    const r = new HmacBodySigner({ secret: "s", header: "X-Sig", algo: "sha256" }).sign(baseReq());
    const expected = crypto.createHmac("sha256", "s").update('{"a":1}').digest("hex");
    expect(r.headers["X-Sig"]).toBe(expected);
  });
  it("composes signers in order", () => {
    const r = new CompositeSigner([new ApiKeyHeaderSigner("K", "v"), new BearerTokenSigner("t")]).sign(baseReq());
    expect(r.headers.K).toBe("v");
    expect(r.headers.Authorization).toBe("Bearer t");
  });
});

describe("webhook verification", () => {
  const secret = "whsec";
  const body = '{"event":"ok"}';
  const verifier = new HmacWebhookVerifier({ secret, header: "X-Sig", algo: "sha512" });
  const sig = crypto.createHmac("sha512", secret).update(body).digest("hex");

  it("accepts a valid signature (case-insensitive header)", () => {
    expect(verifier.verify(body, { "x-sig": sig })).toBe(true);
  });
  it("rejects tampered body, wrong sig, and missing header", () => {
    expect(verifier.verify(body + "x", { "x-sig": sig })).toBe(false);
    expect(verifier.verify(body, { "x-sig": "deadbeef" })).toBe(false);
    expect(verifier.verify(body, {})).toBe(false);
  });
});

describe("catalog normalization", () => {
  it("converts decimals to minor units", () => {
    expect(toMinor("150.00")).toBe(15000);
    expect(toMinor(9.99)).toBe(999);
  });
  it("maps a raw plan via field map", () => {
    const raw = { code: "MTN1GB", label: "1GB", net: "mtn", price: "150.00" };
    const plan = normalizePlan(
      raw,
      { externalId: "code", name: "label", network: "net", costMinor: (r) => toMinor(r.price as string) },
      { currency: "NGN" }
    );
    expect(plan).toMatchObject({ externalId: "MTN1GB", name: "1GB", network: "mtn", costMinor: 15000, currency: "NGN", priceMinor: 0 });
  });
  it("rejects a non-integer cost", () => {
    expect(() =>
      normalizePlan({ c: 1.5 }, { externalId: "c", name: "c", network: "c", costMinor: "c" }, { currency: "NGN" })
    ).toThrow();
  });
  it("normalizes a list", () => {
    const plans = normalizePlans(
      [{ id: "a", cost: 100 }, { id: "b", cost: 200 }],
      { externalId: "id", name: "id", network: "id", costMinor: "cost" },
      { currency: "NGN" }
    );
    expect(plans.map((p) => p.costMinor)).toEqual([100, 200]);
  });
});

describe("error taxonomy", () => {
  it("maps kinds to disposition + retryable", () => {
    expect(new VendorError("declined", "x").disposition).toBe("fail");
    expect(new VendorError("declined", "x").retryable).toBe(false);
    expect(new VendorError("temporary", "x").disposition).toBe("pending");
    expect(new VendorError("temporary", "x").retryable).toBe(true);
    expect(new VendorError("auth", "x").disposition).toBe("escalate");
    expect(dispositionFor("unknown_status")).toBe("pending");
  });
});
