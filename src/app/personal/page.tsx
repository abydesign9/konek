import type { Metadata } from "next";
import { MarketingPage, Hero, Section, FeatureGrid, Stats, CTA } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "Konek for Personal — USD accounts, cards & connectivity in one app",
  description:
    "Open a USD, GBP, EUR or Naira account in your name, spend with virtual cards, stay connected with global eSIM, and pay bills — all in one Konek app built for Africans at home and abroad.",
  keywords: [
    "USD account Nigeria", "virtual dollar card", "multi-currency wallet",
    "receive USD in Nigeria", "eSIM Africa", "pay bills online Nigeria", "Konek",
  ],
  alternates: { canonical: "/personal" },
  openGraph: {
    title: "Konek for Personal — money and connectivity, together",
    description: "USD/GBP/EUR/NGN accounts, virtual cards, eSIM and bills in one app.",
    url: "/personal",
    type: "website",
  },
};

export default function PersonalPage() {
  return (
    <MarketingPage>
      <Hero
        eyebrow="Konek for Personal"
        title={<>Your money and your connection, <span className="text-konek-green">in one place.</span></>}
        subtitle="Receive and hold four currencies, spend anywhere with virtual cards, and stay online in 190+ countries — the everyday essentials of a global life, wrapped into a single Konek account."
        secondary={{ label: "See connectivity", href: "/connectivity" }}
      />

      <Section id="accounts" eyebrow="Accounts" title="Accounts in your own name" intro="Get paid by anyone, anywhere. Hold your balance in the currency that suits you and convert when the rate is right.">
        <FeatureGrid
          items={[
            { icon: "🇺🇸", title: "USD account", body: "A dollar account in your name — even as a non-US resident. Share your details and receive payments from clients and platforms worldwide." },
            { icon: "🌍", title: "GBP & EUR balances", body: "Hold pounds and euros alongside your dollars, ready to spend or convert without juggling multiple apps." },
            { icon: "🇳🇬", title: "Naira account", body: "A dedicated account number to get paid locally, fund instantly, and move money the moment it lands." },
          ]}
        />
      </Section>

      <Section id="cards" tint eyebrow="Cards" title="Virtual cards for a borderless life" intro="Create a card in seconds and pay online the way the rest of the world does.">
        <FeatureGrid
          items={[
            { icon: "💳", title: "Spend online anywhere", body: "Subscriptions, ads, shopping and SaaS — pay international merchants without a card being declined." },
            { icon: "🔒", title: "Secure by default", body: "Freeze and unfreeze instantly, set spend controls, and reveal details only behind a step-up check." },
            { icon: "⚡", title: "Issued instantly", body: "No branch visits, no waiting. Verify once and your card is ready to use immediately." },
          ]}
        />
      </Section>

      <Section eyebrow="Everyday" title="Everything else you reach for">
        <FeatureGrid
          items={[
            { icon: "📶", title: "Airtime & data", body: "Top up any network in seconds, for yourself or someone back home." },
            { icon: "🧾", title: "Bills & TV", body: "Electricity tokens, DStv, GOtv, StarTimes and exam pins — sorted in a tap." },
            { icon: "🎁", title: "Rewards & referrals", body: "Earn as you spend and get rewarded for bringing friends onto Konek." },
          ]}
        />
      </Section>

      <Section tint>
        <Stats
          items={[
            { value: "4", label: "Currencies you can hold" },
            { value: "190+", label: "Countries with eSIM data" },
            { value: "60s", label: "To create a virtual card" },
            { value: "1", label: "App for all of it" },
          ]}
        />
      </Section>

      <CTA
        title="One account for your whole connected life"
        subtitle="Join Konek and get your accounts, cards and connectivity working together from day one."
        secondary={{ label: "Talk to support", href: "/faq" }}
      />
    </MarketingPage>
  );
}
