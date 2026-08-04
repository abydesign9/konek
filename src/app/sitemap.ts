import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/marketing/blogPosts";

const BASE = (process.env.NEXT_PUBLIC_APP_URL ?? "https://konekapp.vercel.app").replace(/\/$/, "");

// Public, indexable marketing pages only — never app/authenticated routes.
const STATIC_PATHS = [
  "/",
  "/personal",
  "/business-solutions",
  "/connectivity",
  "/pricing",
  "/about",
  "/company/careers",
  "/company/blog",
  "/referrals",
  "/ambassadors",
  "/influencers",
  "/creator-club",
  "/help",
  "/help/videos",
  "/faq",
  "/terms",
  "/privacy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = STATIC_PATHS.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.7,
  }));
  const posts = BLOG_POSTS.map((p) => ({
    url: `${BASE}/company/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  return [...pages, ...posts];
}
