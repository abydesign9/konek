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

const PROTECTED_API_PREFIXES = ["/api/keepalive", "/api/cron", "/api/webhooks", "/api/v1"];

function isStateChangingMethod(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

function isAllowedByAuthorizationHeader(request: NextRequest): boolean {
  return !!request.headers.get("authorization");
}

function sameOriginHost(candidate: string, host: string): boolean {
  try {
    const url = new URL(candidate);
    return url.host.replace(/:\d+$/, "") === host.replace(/:\d+$/, "");
  } catch {
    return false;
  }
}

function isSameOriginRequest(request: NextRequest): boolean {
  const host = request.headers.get("host");
  if (!host) return false;

  const origin = request.headers.get("origin");
  if (origin && sameOriginHost(origin, host)) return true;

  const referer = request.headers.get("referer");
  if (referer && sameOriginHost(referer, host)) return true;

  return false;
}

function shouldEnforceCsrf(request: NextRequest): boolean {
  if (!request.nextUrl.pathname.startsWith("/api/")) return false;
  if (!isStateChangingMethod(request.method)) return false;

  const pathname = request.nextUrl.pathname;
  if (PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;

  return true;
}

const MARKETING_PATHS = new Set([
  "/",
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

  if (shouldEnforceCsrf(request) && !isSameOriginRequest(request) && !isAllowedByAuthorizationHeader(request)) {
    return NextResponse.json({ error: "csrf validation failed" }, { status: 403 });
  }

  // ---- Public marketing pages: relaxed, static-cacheable CSP (no nonce) ----
  if (isPublicMarketing(request.nextUrl.pathname)) {
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      ...COMMON_DIRECTIVES(isDev),
    ].join("; ");
    const res = NextResponse.next();
    res.headers.set("Content-Security-Policy", csp);
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("X-Frame-Options", "DENY");
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
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
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
