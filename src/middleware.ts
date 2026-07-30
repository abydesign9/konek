import { NextRequest, NextResponse } from "next/server";

// Two Content-Security-Policy tiers, chosen per request path:
//
//  • The authenticated app (wallet, cards, KYC, admin, everything that touches
//    money or PII) gets a STRICT nonce CSP: `script-src 'nonce-…'
//    'strict-dynamic'` — no 'unsafe-inline', so an injected inline <script>
//    can't run. This requires per-request (dynamic) rendering.
//
//  • The pure public marketing pages (landing, product/company pages, help,
//    legal) get a cache-friendly CSP without a nonce, so they can be STATICALLY
//    generated and served from the CDN — fast. These pages carry no session, no
//    user data and no reflected input, so allowing inline scripts there is low
//    risk. 'unsafe-inline' is scoped to script-src only; object-src, base-uri,
//    frame-ancestors etc. stay locked down.
//
// Login/signup are deliberately treated as app (strict) even though they're
// public — they handle credentials.

const MARKETING_PATHS = new Set([
  "/",
  "/timon-preview",
  "/personal",
  "/business-solutions",
  "/connectivity",
  "/pricing",
  "/about",
  "/referrals",
  "/ambassadors",
  "/influencers",
  "/creator-club",
  "/help",
  "/help/videos",
  "/faq",
  "/terms",
  "/privacy",
]);

function isPublicMarketing(pathname: string): boolean {
  if (MARKETING_PATHS.has(pathname)) return true;
  // /company, /company/careers, /company/blog and blog posts
  if (pathname === "/company" || pathname.startsWith("/company/")) return true;
  return false;
}

const COMMON_DIRECTIVES = (isDev: boolean) => [
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
];

export function middleware(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";

  // ---- Public marketing pages: relaxed, static-cacheable CSP (no nonce) ----
  if (isPublicMarketing(request.nextUrl.pathname)) {
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      ...COMMON_DIRECTIVES(isDev),
    ].join("; ");
    const res = NextResponse.next();
    res.headers.set("Content-Security-Policy", csp);
    return res;
  }

  // ---- App / auth / admin: strict nonce CSP with strict-dynamic ----
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'self'${isDev ? " 'unsafe-eval'" : ""}`,
    ...COMMON_DIRECTIVES(isDev),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
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
