import type { MetadataRoute } from "next";

const BASE = (process.env.NEXT_PUBLIC_APP_URL ?? "https://konekapp.vercel.app").replace(/\/$/, "");

// Let crawlers index the public marketing site, but keep the authenticated app,
// admin console and API surface out of search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/home",
          "/wallet",
          "/cards",
          "/buy/",
          "/marketplace",
          "/profile",
          "/settings",
          "/kyc",
          "/business",
          "/agent",
          "/support",
          "/notifications",
          "/rewards",
          "/squads",
          "/leaderboard",
          "/invite",
          "/esim",
          "/transactions",
          "/setup",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
