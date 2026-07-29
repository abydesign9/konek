import type { Metadata } from "next";
import { MarketingPage, Hero, Section, FeatureGrid, Stats, CTA } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "Konek Referrals — invite friends and earn",
  description:
    "Share Konek and earn rewards when your friends join and transact. Simple, transparent referral rewards paid straight to your wallet.",
  keywords: ["Konek referral", "refer and earn", "invite friends Konek", "referral rewards Nigeria"],
  alternates: { canonical: "/referrals" },
  openGraph: {
    title: "Konek Referrals — invite friends and earn",
    description: "Share Konek and get rewarded when friends join and transact.",
    url: "/referrals",
    type: "website",
  },
};

export default function ReferralsPage() {
  return (
    <MarketingPage>
      <Hero
        eyebrow="Referrals"
        title={<>Share Konek, <span className="text-konek-green">earn rewards.</span></>}
        subtitle="Everyone you know could use easier money and connectivity. Invite them to Konek and get rewarded when they join and start transacting — paid straight to your wallet."
        primary={{ label: "Start referring", href: "/signup" }}
        secondary={{ label: "How it works", href: "#how" }}
      />

      <Section id="how" eyebrow="How it works" title="Three simple steps">
        <FeatureGrid
          items={[
            { icon: "🔗", title: "Share your link", body: "Grab your unique invite link from the app and share it with friends and family." },
            { icon: "📲", title: "They join Konek", body: "Your friend signs up with your link, verifies, and starts using Konek." },
            { icon: "🎉", title: "You get rewarded", body: "When they transact, your reward lands in your wallet — clear and automatic." },
          ]}
        />
      </Section>

      <Section tint eyebrow="Why refer" title="Rewards that actually reward you">
        <FeatureGrid
          items={[
            { icon: "💸", title: "Real value", body: "Referral rewards are paid to your wallet — money you can spend or withdraw, not points that expire." },
            { icon: "♾️", title: "No limit on friends", body: "Invite as many people as you like. The more who join and transact, the more you earn." },
            { icon: "🤝", title: "Good for everyone", body: "Your friends get a better way to manage money and stay connected. You get rewarded for the intro." },
          ]}
        />
      </Section>

      <Section>
        <Stats
          items={[
            { value: "3", label: "Steps to earn" },
            { value: "₦/$", label: "Paid to your wallet" },
            { value: "∞", label: "Friends you can invite" },
            { value: "24/7", label: "Share anytime" },
          ]}
        />
      </Section>

      <CTA
        title="Turn your network into rewards"
        subtitle="Create your account, grab your invite link, and start earning by sharing Konek."
        primary={{ label: "Get my invite link", href: "/signup" }}
        secondary={{ label: "See Creator Club", href: "/creator-club" }}
      />
    </MarketingPage>
  );
}
