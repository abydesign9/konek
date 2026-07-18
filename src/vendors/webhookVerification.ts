import crypto from "node:crypto";

// Shared inbound-webhook verification interface. Providers sign callbacks
// differently (HMAC of the raw body in hex or base64, in various headers), so a
// provider supplies a WebhookVerifier that the generic webhook framework calls.
// All verification is constant-time and operates on the RAW body.

export interface WebhookVerifier {
  // headers should be lower-cased keys. Returns true only for a valid signature.
  verify(rawBody: string, headers: Record<string, string>): boolean;
}

function constantTimeEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// HMAC of the raw body compared (constant-time) against a header value.
export class HmacWebhookVerifier implements WebhookVerifier {
  constructor(
    private readonly opts: {
      secret: string;
      header: string; // e.g. "x-provider-signature"
      algo: "sha256" | "sha512";
      encoding?: "hex" | "base64";
    }
  ) {}

  verify(rawBody: string, headers: Record<string, string>): boolean {
    const provided = headers[this.opts.header.toLowerCase()];
    if (!provided || !this.opts.secret) return false;
    const expected = crypto
      .createHmac(this.opts.algo, this.opts.secret)
      .update(rawBody)
      .digest(this.opts.encoding ?? "hex");
    return constantTimeEquals(expected, provided);
  }
}

// Accepts everything — ONLY for providers that authenticate callbacks another
// way (e.g. mTLS/IP allowlist) or for tests. Must be a conscious choice.
export const insecureAcceptAllVerifier: WebhookVerifier = { verify: () => true };
