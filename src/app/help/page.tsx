import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPage, Hero, Section, FeatureGrid, CTA } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "Konek Help Center — support, FAQs & video guides",
  description:
    "Get help with Konek anytime. Browse FAQs, watch step-by-step video guides, and reach our support team 24/7 for accounts, cards, eSIM, funding and verification.",
  keywords: ["Konek help", "Konek support", "Konek FAQ", "contact Konek", "Konek video guides"],
  alternates: { canonical: "/help" },
  openGraph: {
    title: "Konek Help Center",
    description: "FAQs, video guides and 24/7 support.",
    url: "/help",
    type: "website",
  },
};

export default function HelpPage() {
  return (
    <MarketingPage>
      <Hero
        eyebrow="Help Center"
        title={<>We&apos;re here to help, <span className="text-konek-green">around the clock.</span></>}
        subtitle="Find quick answers, watch how-to videos, or reach our support team any time of day. Whatever you need with Konek, help is a tap away."
        primary={{ label: "Browse FAQs", href: "/faq" }}
        secondary={{ label: "Watch video guides", href: "/help/videos" }}
      />

      <Section eyebrow="Ways to get help" title="Choose what works for you">
        <FeatureGrid
          items={[
            { icon: "❓", title: "FAQs", body: "Get answers to your questions about Konek — accounts, cards, funding, eSIM, verification and more." },
            { icon: "🎬", title: "Video guides", body: "Watch step-by-step videos that show you exactly how to use each Konek feature." },
            { icon: "💬", title: "24/7 support", body: "Our support team is here around the clock. Chat with us in the app whenever you need a hand." },
          ]}
        />
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/faq" className="rounded-full bg-indigo px-6 py-3 text-sm font-semibold text-white hover:bg-konek-green">Go to FAQs</Link>
          <Link href="/help/videos" className="rounded-full border border-indigo/20 px-6 py-3 text-sm font-semibold text-indigo">Video guides</Link>
        </div>
      </Section>

      <Section tint eyebrow="Popular topics" title="Quick answers to common questions">
        <FeatureGrid
          items={[
            { icon: "🏦", title: "Opening an account", body: "How to open your USD, GBP, EUR or Naira account and get paid from anywhere." },
            { icon: "💳", title: "Cards", body: "Creating, funding, freezing and troubleshooting your virtual card." },
            { icon: "📶", title: "eSIM & connectivity", body: "Buying, installing and activating an eSIM, plus airtime, data and bills." },
            { icon: "🔐", title: "Verification (KYC)", body: "What we need to verify you, why, and how to move to a higher tier." },
            { icon: "💵", title: "Funding & withdrawals", body: "How money moves in and out, timelines, and what to check first." },
            { icon: "🛡️", title: "Account security", body: "PINs, sessions, and steps to take if you think something's wrong." },
          ]}
        />
      </Section>

      <CTA
        title="Still need a hand?"
        subtitle="Our team is available 24/7 in the app. Log in and start a chat, and we'll take it from there."
        primary={{ label: "Open the app", href: "/login" }}
        secondary={{ label: "Read FAQs", href: "/faq" }}
      />
    </MarketingPage>
  );
}
