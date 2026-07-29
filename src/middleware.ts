import { NextRequest, NextResponse } from "next/server";

// Per-request Content-Security-Policy with a nonce. This replaces the static
// `script-src 'self' 'unsafe-inline'` (which allowed any inline <script>, the
// classic XSS foothold) with `'nonce-<random>' 'strict-dynamic'`: only scripts
// Next.js tags with this request's nonce run, and scripts they load inherit
// trust — no host allowlist, no unsafe-inline. Next 14 reads the CSP off the
// incoming request headers and stamps the nonce onto its framework scripts
// automatically, so no component code needs to change.
//
// style-src keeps 'unsafe-inline': Tailwind and React set inline style
// attributes that can't carry a nonce, and inline styles are not a script
// execution vector. connect-src stays 'self' — every vendor call is server-side.
export function middleware(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const csp = [
    "default-src 'self'",
    // 'strict-dynamic' makes supporting browsers ignore 'self'/host lists and
    // trust only nonce'd scripts + what they load. 'unsafe-eval' is dev-only
    // (Next fast-refresh); it never ships to production.
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'self'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  // Pass the nonce + CSP to Next on the *request* so it can stamp inline
  // framework scripts, and set the CSP on the *response* the browser enforces.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Run on document navigations only. Static assets, images, the service worker
  // and its workbox runtime, and API routes (JSON, no inline scripts) are
  // excluded so we neither pay middleware cost nor break precached assets.
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-|fallback-|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|xml|json|js|woff2?)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
