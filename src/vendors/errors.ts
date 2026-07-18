// Common vendor error taxonomy. Adapters classify provider failures into these
// kinds so the business layer reacts consistently, without knowing anything
// provider-specific. This is distinct from transport errors (see
// resilientHttp.ts: timeout/http/network/circuit) — these are *semantic*
// outcomes of an otherwise-successful call.
export type VendorErrorKind =
  | "declined" // permanent business decline (bad number, product unavailable) -> transaction fails
  | "invalid_request" // our request was malformed -> fails, never retry
  | "auth" // credential/permission problem -> ops alert, never retry
  | "insufficient_float" // provider float exhausted -> route elsewhere, don't fail the user
  | "temporary" // transient provider error -> safe to retry / leave pending
  | "unknown_status"; // outcome indeterminate -> treat as pending and requery via verify()

// How the spend path should treat a given error kind.
//   fail    -> release the reservation (refund), mark failed
//   pending -> keep funds reserved; recovery worker requeries via verify()
//   escalate-> not the user's fault; surface to ops, keep reserved/pending
export type VendorDisposition = "fail" | "pending" | "escalate";

const DISPOSITION: Record<VendorErrorKind, VendorDisposition> = {
  declined: "fail",
  invalid_request: "fail",
  auth: "escalate",
  insufficient_float: "escalate",
  temporary: "pending",
  unknown_status: "pending",
};

const RETRYABLE: Record<VendorErrorKind, boolean> = {
  declined: false,
  invalid_request: false,
  auth: false,
  insufficient_float: false,
  temporary: true,
  unknown_status: true,
};

export class VendorError extends Error {
  readonly kind: VendorErrorKind;
  readonly providerCode?: string; // the provider's own error/status code, for logs
  readonly raw?: unknown;

  constructor(kind: VendorErrorKind, message: string, opts?: { providerCode?: string; raw?: unknown }) {
    super(message);
    this.name = "VendorError";
    this.kind = kind;
    this.providerCode = opts?.providerCode;
    this.raw = opts?.raw;
  }

  get retryable(): boolean {
    return RETRYABLE[this.kind];
  }
  get disposition(): VendorDisposition {
    return DISPOSITION[this.kind];
  }
}

export function dispositionFor(kind: VendorErrorKind): VendorDisposition {
  return DISPOSITION[kind];
}
