import { NextResponse } from "next/server";

// Mock endpoints are development stand-ins for real provider webhooks (a mock
// Paystack checkout, a mock bank inflow). They self-deliver a correctly-signed
// webhook to the production code path — which means anyone who can reach one in
// production could credit their own wallet without paying. They must therefore
// be unreachable unless mocks are explicitly enabled.
//
// Rule: mocks are allowed only when ENABLE_MOCKS=true, or outside production.
// In production without the flag every mock route hard-404s (indistinguishable
// from "route does not exist"), regardless of whether provider keys are set.
// Pre-launch environments that still rely on mocks must set ENABLE_MOCKS=true
// and remove it at go-live (see the Mock → Real flip checklist).
export function mocksEnabled(): boolean {
  return process.env.ENABLE_MOCKS === "true" || process.env.NODE_ENV !== "production";
}

// Returns a 404 response when mocks are disabled, or null when the caller may
// proceed. Call this as the very first line of every mock route handler.
export function mockDisabledResponse(): NextResponse | null {
  if (mocksEnabled()) return null;
  return NextResponse.json({ error: "not found" }, { status: 404 });
}
