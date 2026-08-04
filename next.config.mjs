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

// The Content-Security-Policy is set per-request in src/middleware.ts because it
// carries a nonce (see that file). Everything below is request-independent and
// stays here as static headers applied to every route.
const securityHeaders = [
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
  // Lint runs in CI/dev; don't let a cosmetic lint rule block a production deploy.
  eslint: { ignoreDuringBuilds: true },
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
