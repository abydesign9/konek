import type { Metadata } from "next";
import { MarketingPage, Hero, Section, FeatureGrid, CTA } from "@/components/marketing/ui";
import { ApplicationForm } from "@/components/marketing/ApplicationForm";

export const metadata: Metadata = {
  title: "Konek Influencers — get paid to create content for Konek",
  description:
    "Join the Konek Influencer program and get paid to create content for Konek. Share what you love about global money and connectivity with your audience and earn.",
  keywords: ["Konek influencer program", "get paid to create content", "fintech influencer Nigeria", "creator partnerships"],
  alternates: { canonical: "/influencers" },
  openGraph: {
    title: "Konek Influencers",
    description: "Get paid to create content for Konek.",
    url: "/influencers",
    type: "website",
  },
};

export default function InfluencersPage() {
  return (
    <MarketingPage>
      <Hero
        eyebrow="Influencers"
        title={<>Get paid to create <span className="text-konek-green">for Konek.</span></>}
        subtitle="If your audience trusts your voice, we want to work with you. Join the Konek Influencer program, create content you're proud of, and get paid for the impact you drive."
        primary={{ label: "Apply now", href: "#apply" }}
        secondary={{ label: "Creator Club", href: "/creator-club" }}
      />

      <Section eyebrow="Why partner" title="A program built for creators">
        <FeatureGrid
          items={[
            { icon: "💵", title: "Get paid", body: "Earn for the content you make and the sign-ups and activity it drives — clear, performance-friendly rewards." },
            { icon: "🎨", title: "Creative freedom", body: "You know your audience best. Create in your own voice; we'll support you with briefs, not scripts." },
            { icon: "📈", title: "Grow with us", body: "Track your impact, unlock higher tiers, and grow alongside a fast-moving brand." },
            { icon: "🎁", title: "Perks & early access", body: "First looks at new features, exclusive assets and creator-only perks." },
            { icon: "🤝", title: "Real partnership", body: "A dedicated point of contact and a team that treats creators as partners, not line items." },
            { icon: "🌍", title: "A story worth telling", body: "Help Africans at home and abroad go global — content with genuine meaning behind it." },
          ]}
        />
      </Section>

      <Section tint eyebrow="Who it's for" title="Creators of every size">
        <div className="max-w-2xl space-y-4 text-lg leading-relaxed text-indigo/70">
          <p>
            Whether you&apos;re a rising creator or an established voice, what matters is an engaged audience and a
            genuine connection to what Konek does — global money and connectivity made simple.
          </p>
          <p>
            Tell us about you and your platforms when you apply, and we&apos;ll find the right way to work together.
          </p>
        </div>
      </Section>

      <Section id="apply" tint eyebrow="Apply" title="Start your influencer application">
        <ApplicationForm program="influencer" />
      </Section>

      <CTA
        title="Prefer to explore first?"
        subtitle="Check out the Creator Club or Campus Ambassador program to find your best fit."
        primary={{ label: "Creator Club", href: "/creator-club" }}
        secondary={{ label: "Campus Ambassadors", href: "/ambassadors" }}
      />
    </MarketingPage>
  );
}
