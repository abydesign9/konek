import type { Metadata } from "next";
import { MarketingPage, Hero, Section, FeatureGrid, Stats, CTA } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "Konek for Business — pay teams, collect globally, control spend",
  description:
    "Run your business on Konek: multi-currency accounts to collect from clients worldwide, batch payouts to staff and contractors, virtual cards with controls, and connectivity for your whole team.",
  keywords: [
    "business USD account", "pay contractors Nigeria", "bulk payroll Africa",
    "multi-currency business account", "corporate virtual cards", "Konek for business",
  ],
  alternates: { canonical: "/business-solutions" },
  openGraph: {
    title: "Konek for Business — global money for growing teams",
    description: "Collect globally, pay your team, and control spend from one dashboard.",
    url: "/business-solutions",
    type: "website",
  },
};

export default function BusinessSolutionsPage() {
  return (
    <MarketingPage>
      <Hero
        eyebrow="Konek for Business"
        title={<>Global money for <span className="text-konek-green">growing teams.</span></>}
        subtitle="Collect from clients in any currency, pay your team and contractors in a single batch, and give everyone the connectivity and cards they need — with the controls finance teams expect."
        primary={{ label: "Start with business", href: "/signup" }}
        secondary={{ label: "See pricing", href: "/pricing" }}
      />

      <Section eyebrow="Collect & hold" title="Get paid from anywhere" intro="Share account details clients recognise and settle in the currency you want to hold.">
        <FeatureGrid
          items={[
            { icon: "💵", title: "Multi-currency accounts", body: "Receive USD, GBP, EUR and NGN into accounts in your business name and hold your balance until you're ready to convert." },
            { icon: "📥", title: "One place for inflows", body: "Client payments, platform payouts and marketplace earnings land in a single, reconciled view." },
            { icon: "🔁", title: "Convert on your terms", body: "Move between currencies when the rate works for you — no scrambling across apps." },
          ]}
        />
      </Section>

      <Section tint eyebrow="Pay & control" title="Pay your team, keep control" intro="From a two-person startup to a distributed workforce, run payouts and spend without the spreadsheet chaos.">
        <FeatureGrid
          items={[
            { icon: "👥", title: "Batch payouts", body: "Pay staff, freelancers and vendors in one upload, with a clear record of every transfer." },
            { icon: "💳", title: "Cards with limits", body: "Issue virtual cards for teams and campaigns, each with its own spend controls and freeze switch." },
            { icon: "🛡️", title: "Roles & approvals", body: "Give finance, ops and support the access they need — and nothing they don't." },
            { icon: "📊", title: "Clear reporting", body: "Exportable statements and reconciliation so month-end is calm, not chaotic." },
            { icon: "📶", title: "Team connectivity", body: "Airtime, data and eSIM for the whole team, managed centrally." },
            { icon: "🤝", title: "Grow with agents", body: "Extend your reach with Konek's agent and partner network." },
          ]}
        />
      </Section>

      <Section>
        <Stats
          items={[
            { value: "4", label: "Currencies to collect" },
            { value: "1", label: "Upload to pay everyone" },
            { value: "∞", label: "Virtual cards, on demand" },
            { value: "24/7", label: "Always-on access" },
          ]}
        />
      </Section>

      <CTA
        title="Build your business on Konek"
        subtitle="Bring collections, payouts, cards and connectivity into one dashboard — and get back to the work that matters."
        primary={{ label: "Get started", href: "/signup" }}
        secondary={{ label: "Talk to us", href: "/faq" }}
      />
    </MarketingPage>
  );
}
