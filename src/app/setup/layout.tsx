import type { ReactNode } from "react";

// Authenticated / interactive app subtree: force dynamic rendering so middleware
// can stamp a per-request nonce for the strict CSP (see src/middleware.ts). These
// routes are never statically cached. (Route Segment Config only takes effect in
// a server component like this layout — not in a "use client" page.)
export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
