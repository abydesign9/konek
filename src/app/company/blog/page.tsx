import type { Metadata } from "next";
import { MarketingPage, Hero, Section, FeatureGrid, CTA } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "Konek Blog — product updates, news & money tips",
  description:
    "The Konek blog: product updates, company news, and practical guides on multi-currency accounts, cards, eSIM and getting paid globally as an African at home or abroad.",
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

      <Section eyebrow="What we write about" title="Topics we cover">
        <FeatureGrid
          items={[
            { icon: "💵", title: "Getting paid globally", body: "How to receive USD, GBP and EUR as an African freelancer, creator or business — and keep more of it." },
            { icon: "✈️", title: "Travel & eSIM", body: "Staying connected abroad without roaming bills: how eSIM works and how to pick the right plan." },
            { icon: "💳", title: "Cards & spending", body: "Using virtual cards safely for subscriptions, ads and online shopping anywhere." },
            { icon: "🛡️", title: "Security & trust", body: "How we protect your money and data — and simple habits to keep your account safe." },
            { icon: "🧾", title: "Everyday money", body: "Airtime, data and bills tips to save time and money for you and your family." },
            { icon: "📣", title: "Product updates", body: "New features, currencies and countries as Konek grows." },
          ]}
        />
      </Section>

      <Section tint eyebrow="Coming soon" title="Fresh posts are on the way">
        <div className="max-w-2xl space-y-4 text-lg leading-relaxed text-indigo/70">
          <p>
            We&apos;re publishing our first guides and product stories now. In the meantime, create your account to
            get updates first — and to start using the tools we write about.
          </p>
        </div>
      </Section>

      <CTA
        title="Be first to read what's next"
        subtitle="Join Konek and get product news and guides as soon as they land."
        primary={{ label: "Create account", href: "/signup" }}
        secondary={{ label: "Explore products", href: "/personal" }}
      />
    </MarketingPage>
  );
}
