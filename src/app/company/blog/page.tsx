import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPage, Hero, Section, CTA } from "@/components/marketing/ui";
import { BLOG_POSTS, formatDate } from "@/lib/marketing/blogPosts";

export const metadata: Metadata = {
  title: "Konek Blog — product updates, news & money tips",
  description:
    "The Konek blog: practical guides on receiving USD, using eSIM, virtual cards and staying secure — plus product updates and news for Africans at home and abroad.",
  keywords: ["Konek blog", "fintech tips Africa", "how to receive USD", "eSIM guide", "diaspora money tips"],
  alternates: { canonical: "/company/blog" },
  openGraph: {
    title: "Konek Blog",
    description: "Product updates, news and money tips from the Konek team.",
    url: "/company/blog",
    type: "website",
  },
};

export default function BlogPage() {
  return (
    <MarketingPage>
      <Hero
        eyebrow="Blog"
        title={<>Ideas for a <span className="text-konek-green">connected life.</span></>}
        subtitle="Practical guides, product updates and honest takes on money and connectivity across borders — from the team building Konek."
        primary={{ label: "Get started", href: "/signup" }}
        secondary={{ label: "About Konek", href: "/about" }}
      />

      <Section eyebrow="Latest" title="Fresh from the Konek blog">
        <div className="grid gap-5 md:grid-cols-3">
          {BLOG_POSTS.map((p) => (
            <Link
              key={p.slug}
              href={`/company/blog/${p.slug}`}
              className="konek-card-shadow flex flex-col rounded-2xl border border-indigo/5 bg-white p-6 transition-transform hover:-translate-y-0.5"
            >
              <span className="text-xs font-bold uppercase tracking-wide text-konek-green">{p.category}</span>
              <h3 className="mt-2 font-heading text-lg font-bold leading-snug text-indigo">{p.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-indigo/60">{p.excerpt}</p>
              <span className="mt-4 text-xs text-indigo/45">{formatDate(p.date)} · {p.readMinutes} min read</span>
            </Link>
          ))}
        </div>
      </Section>

      <CTA
        title="Put the ideas to work"
        subtitle="Create your Konek account and start using the tools we write about."
        primary={{ label: "Create account", href: "/signup" }}
        secondary={{ label: "Explore products", href: "/personal" }}
      />
    </MarketingPage>
  );
}
