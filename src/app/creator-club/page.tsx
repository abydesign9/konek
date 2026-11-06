import type { Metadata } from "next";
import { MarketingPage, Hero, Section, FeatureGrid, Stats, CTA } from "@/components/marketing/ui";
import { ApplicationForm } from "@/components/marketing/ApplicationForm";

export const metadata: Metadata = {
  title: "raviion Creator Club — the home for creators paid globally",
  description:
    "The raviion Creator Club is where African creators who earn internationally get the accounts, cards, perks and community to get paid globally and keep more of what they make.",
  keywords: ["raviion creator club", "creators paid globally", "receive USD creator", "African creators payments", "creator community"],
  alternates: { canonical: "/creator-club" },
  openGraph: {
    title: "raviion Creator Club",
    description: "The home for African creators paid globally.",
    url: "/creator-club",
    type: "website",
  },
};

export default function CreatorClubPage() {
  return (
    <MarketingPage>
      <Hero
        eyebrow="Creator Club"
        title={<>Built for creators <span className="text-raviion-green">paid globally.</span></>}
        subtitle="If you earn from brands, platforms and fans around the world, the raviion Creator Club gives you the accounts, cards, perks and community to get paid globally — and keep more of what you make."
        primary={{ label: "Join the club", href: "#apply" }}
        secondary={{ label: "Influencer program", href: "/influencers" }}
      />

      <Section eyebrow="Why join" title="Everything a global creator needs">
        <FeatureGrid
          items={[
            { icon: "💵", title: "Get paid in USD", body: "Receive payments from brands, platforms and clients into a USD account in your name — no more bounced payouts." },
            { icon: "💳", title: "Cards that work", body: "Spend on the tools of your trade — subscriptions, ads and gear — with virtual cards accepted worldwide." },
            { icon: "🌍", title: "Hold & convert", body: "Keep your earnings in USD, GBP or EUR and convert to Naira when the rate works for you." },
            { icon: "🎁", title: "Creator perks", body: "Member-only rewards, early feature access and partner discounts on the tools you use." },
            { icon: "👥", title: "A real community", body: "Connect with other creators, swap what's working, and grow together." },
            { icon: "📚", title: "Grow your craft", body: "Resources and sessions on getting paid, pricing your work and going global." },
          ]}
        />
      </Section>

      <Section tint eyebrow="How it works" title="From audience to income, simplified">
        <FeatureGrid
          items={[
            { icon: "1️⃣", title: "Open your account", body: "Join raviion, verify once, and set up your global receiving accounts and cards." },
            { icon: "2️⃣", title: "Get paid globally", body: "Share your details with brands and platforms and receive your earnings with less friction and fewer fees." },
            { icon: "3️⃣", title: "Grow with the club", body: "Tap perks, community and resources to earn more and level up your creator business." },
          ]}
        />
      </Section>

      <Section>
        <Stats
          items={[
            { value: "USD", label: "Get paid in dollars" },
            { value: "3", label: "Currencies to hold" },
            { value: "Perks", label: "Members only" },
            { value: "Community", label: "Of creators" },
          ]}
        />
      </Section>

      <Section id="apply" tint eyebrow="Apply" title="Join the Creator Club">
        <ApplicationForm program="creator_club" />
      </Section>

      <CTA
        title="Your creativity is global. Your money should be too."
        subtitle="Questions before you apply? Our Help Center has answers, or explore how referrals work."
        primary={{ label: "Visit Help Center", href: "/help" }}
        secondary={{ label: "Refer & earn", href: "/referrals" }}
      />
    </MarketingPage>
  );
}
