import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // Don't let the precache manifest enumerate the app's route map — especially
  // the admin console. Precaching those chunks both leaks the surface and serves
  // no offline value (admin/api are online-only). App-shell/public assets still
  // precache normally.
  buildExcludes: [
    /app-build-manifest\.json$/,
    /middleware-manifest\.json$/,
    /_buildManifest\.js$/,
    /_ssgManifest\.js$/,
    /\/admin\//,
    /server\/.*$/,
  ],
});

const isDev = process.env.NODE_ENV === "development";

// Content Security Policy. connect-src 'self' is the structural guarantee that
// the browser can only talk to our own backend (our /api routes) and never a
// third party directly. All vendor calls (Paystack, eSIM, KYC...) happen
// server-side. In development we relax script/connect so Next's HMR websocket
// and eval-based fast refresh keep working; production stays strict.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
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

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false, // don't advertise the framework
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Sensitive JSON (balances, PII, tokens) must never be cached by the
        // browser, a shared CDN, or the service worker.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, no-cache, must-revalidate" }],
      },
    ];
  },
};

export default withPWA(nextConfig);
