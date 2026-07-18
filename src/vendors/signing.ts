import crypto from "node:crypto";

// Shared outbound-request signing interface. Providers authenticate differently
// (API-key header, bearer token, HMAC body signature, request-id nonce…), so an
// adapter composes one or more RequestSigner implementations rather than baking
// auth into call sites. All implementations here are generic — no provider
// specifics. Secrets come from getVendorSecret (env), never the DB.

export interface OutboundRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface RequestSigner {
  sign(req: OutboundRequest): OutboundRequest;
}

// Adds a static header, e.g. `Api-Key: <value>` or `X-Api-Key: <prefix><value>`.
export class ApiKeyHeaderSigner implements RequestSigner {
  constructor(private readonly header: string, private readonly value: string, private readonly prefix = "") {}
  sign(req: OutboundRequest): OutboundRequest {
    return { ...req, headers: { ...req.headers, [this.header]: `${this.prefix}${this.value}` } };
  }
}

// `Authorization: Bearer <token>`.
export class BearerTokenSigner implements RequestSigner {
  constructor(private readonly token: string) {}
  sign(req: OutboundRequest): OutboundRequest {
    return { ...req, headers: { ...req.headers, Authorization: `Bearer ${this.token}` } };
  }
}

// HMAC of the request body into a header, e.g. `X-Signature: <hex>`.
export class HmacBodySigner implements RequestSigner {
  constructor(
    private readonly opts: { secret: string; header: string; algo: "sha256" | "sha512"; encoding?: "hex" | "base64" }
  ) {}
  sign(req: OutboundRequest): OutboundRequest {
    const digest = crypto
      .createHmac(this.opts.algo, this.opts.secret)
      .update(req.body ?? "")
      .digest(this.opts.encoding ?? "hex");
    return { ...req, headers: { ...req.headers, [this.opts.header]: digest } };
  }
}

// Applies several signers in order (e.g. API key + HMAC signature).
export class CompositeSigner implements RequestSigner {
  constructor(private readonly signers: RequestSigner[]) {}
  sign(req: OutboundRequest): OutboundRequest {
    return this.signers.reduce((r, s) => s.sign(r), req);
  }
}

// No-op signer (public endpoints / tests).
export const noopSigner: RequestSigner = { sign: (req) => req };
