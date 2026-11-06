import type { Metadata } from "next";
import { MarketingPage, Hero, Section, FeatureGrid, Stats, CTA } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "raviion for Business | Collect, pay and control spend",
  description:
    "Run your business on raviion with multi-currency accounts, batch payouts, virtual cards and connectivity for your team.",
  keywords: [
    "business USD account", "pay contractors Nigeria", "bulk payroll Africa",
    "multi-currency business account", "corporate virtual cards", "raviion for business",
  ],
  alternates: { canonical: "/business-solutions" },
  openGraph: {
    title: "raviion for Business | Collect, pay and control spend",
    description: "Collect globally, pay your team and control spend from one dashboard.",
    url: "/business-solutions",
    type: "website",
  },
};

export default function BusinessSolutionsPage() {
  return (
    <MarketingPage>
      <Hero
        eyebrow="raviion for Business"
        title={<>Manage money and <span className="text-raviion-green">team access in one place.</span></>}
        subtitle="Collect from clients in different currencies, pay staff and contractors in one batch and give your team the data, cards and services they need without extra admin."
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
            { icon: "🤝", title: "Grow with agents", body: "Extend your reach with raviion's agent and partner network." },
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
        title="Build your business on raviion"
        subtitle="Bring collections, payouts, cards and connectivity into one dashboard — and get back to the work that matters."
        primary={{ label: "Get started", href: "/signup" }}
        secondary={{ label: "Talk to us", href: "/faq" }}
      />
    </MarketingPage>
  );
}
