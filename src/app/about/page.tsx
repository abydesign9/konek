import type { Metadata } from "next";
import { MarketingPage, Hero, Section, FeatureGrid, Stats, CTA } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "About Konek — connecting Africa to the world",
  description:
    "Konek is building the connectivity and payments layer for Africans at home and abroad — one app for multi-currency accounts, cards, global eSIM and everyday bills. A product of Topton Global Consult.",
  keywords: [
    "about Konek", "Konek fintech", "African connectivity platform",
    "Topton Global Consult", "diaspora payments", "global accounts Africa",
  ],
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Konek — connecting Africa to the world",
    description: "One app for accounts, cards, eSIM and bills — for Africans everywhere.",
    url: "/about",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <MarketingPage>
      <Hero
        eyebrow="About us"
        title={<>We connect Africa <span className="text-konek-green">to the world.</span></>}
        subtitle="Konek exists so that being African — at home or anywhere on earth — never means being cut off from money or connection. One account for the tools a global life actually needs."
        primary={{ label: "Join Konek", href: "/signup" }}
        secondary={{ label: "Explore products", href: "/personal" }}
      />

      <Section eyebrow="Our mission" title="Borders shouldn't decide who belongs to the global economy">
        <div className="max-w-3xl space-y-5 text-lg leading-relaxed text-indigo/70">
          <p>
            For millions of Africans, the hardest part of ambition isn&apos;t the work — it&apos;s the plumbing.
            A dollar account you can&apos;t open. A card that gets declined abroad. A SIM that stops working the
            moment you land. Airtime for family that takes three apps and a prayer to send.
          </p>
          <p>
            Konek was built to erase that friction. We bring receiving accounts in four currencies, virtual
            cards that work everywhere, global eSIM connectivity, and the everyday bills you pay each week into
            a single, trustworthy app — so your money and your connection finally move as fast as you do.
          </p>
        </div>
      </Section>

      <Section tint eyebrow="Our story" title="It started with a simple frustration">
        <div className="max-w-3xl space-y-5 text-lg leading-relaxed text-indigo/70">
          <p>
            Konek began with a familiar scene: a talented freelancer in Lagos, paid by clients overseas, losing
            days and a cut of every invoice just trying to receive and use their own money — while a relative
            abroad struggled to send airtime home. Two sides of the same broken pipe.
          </p>
          <p>
            We set out to build the layer that should have existed all along. Not another wallet bolted onto a
            single feature, but one connected experience where accounts, cards, connectivity and bills work
            together — designed for how Africans actually live, move and support each other across borders.
          </p>
          <p>
            Today Konek keeps growing that promise: more currencies, more countries and more ways to stay
            connected — always with security and fairness at the core.
          </p>
        </div>
      </Section>

      <Section eyebrow="What we stand for" title="The principles behind every feature">
        <FeatureGrid
          items={[
            { icon: "🔒", title: "Trust first", body: "Encryption, PINs, fraud monitoring and verification aren't add-ons — they're the foundation everything else is built on." },
            { icon: "🌍", title: "Built for movement", body: "For students, freelancers, families and founders who live between countries and can't afford to be cut off." },
            { icon: "⚖️", title: "Fair by design", body: "Transparent pricing and honest rates. We win when you keep more of your money, not less." },
            { icon: "⚡", title: "Effortless", body: "The hard engineering is ours to carry. What you feel is a tap that just works." },
            { icon: "🤝", title: "Community-powered", body: "Agents, partners and referrals extend Konek to the people who need it, wherever they are." },
            { icon: "📈", title: "Here to last", body: "We build durable financial infrastructure — the kind you can rely on for years, not a trend." },
          ]}
        />
      </Section>

      <Section tint>
        <Stats
          items={[
            { value: "4", label: "Currencies supported" },
            { value: "190+", label: "eSIM destinations" },
            { value: "10+", label: "Bill & VAS categories" },
            { value: "1", label: "App to run it all" },
          ]}
        />
      </Section>

      <Section eyebrow="Who we are" title="A product of Topton Global Consult">
        <div className="max-w-3xl space-y-5 text-lg leading-relaxed text-indigo/70">
          <p>
            Konek is a product of <strong className="text-indigo">Topton Global Consult</strong> — the team
            behind our technology, partnerships and standards of care. It&apos;s the foundation that lets us move
            quickly while holding a high bar for security, compliance and reliability.
          </p>
          <p>
            We&apos;re just getting started, and we&apos;d love for you to be part of it — as a customer, a partner,
            or a member of the team building it.
          </p>
        </div>
      </Section>

      <CTA
        title="Come build the connected future with us"
        subtitle="Whether you want to use Konek or help build it, there's a place for you here."
        primary={{ label: "Get started", href: "/signup" }}
        secondary={{ label: "See careers", href: "/company/careers" }}
      />
    </MarketingPage>
  );
}
