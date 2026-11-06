import type { Metadata } from "next";
import { MarketingPage, Hero, Section, FeatureGrid, Stats, CTA } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "About raviion | Building a better way to move and pay",
  description:
    "raviion helps Africans move money, pay bills and stay connected from home or abroad. One app for accounts, cards, eSIM data and everyday essentials.",
  keywords: [
    "about raviion", "raviion fintech", "African connectivity platform",
    "Topton Global Consult", "diaspora payments", "global accounts Africa",
  ],
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About raviion | Building a better way to move and pay",
    description: "One app for accounts, cards, eSIM and bills for people living across borders.",
    url: "/about",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <MarketingPage>
      <Hero
        eyebrow="About us"
        title={<>We make life <span className="text-raviion-green">less complicated across borders.</span></>}
        subtitle="raviion exists for people who need money and connection to work wherever they are. One account for the essentials that matter most."
        primary={{ label: "Join raviion", href: "/signup" }}
        secondary={{ label: "Explore products", href: "/personal" }}
      />

      <Section eyebrow="Our mission" title="Life should not stop because of distance">
        <div className="max-w-3xl space-y-5 text-lg leading-relaxed text-indigo/70">
          <p>
            For millions of Africans, the hard part is not the work. It is the friction: a dollar account that is hard to open, a card that fails abroad, a SIM that stops working when you land, or the time it takes to send airtime home.
          </p>
          <p>
            raviion was built to remove that friction. We bring multi-currency accounts, virtual cards, eSIM data and essential bill payments into a single app so money and connection work without delays.
          </p>
        </div>
      </Section>

      <Section tint eyebrow="Our story" title="It started with a simple problem">
        <div className="max-w-3xl space-y-5 text-lg leading-relaxed text-indigo/70">
          <p>
            raviion began with a familiar problem: a freelancer in Lagos paid by overseas clients, losing days and a chunk of every invoice just to receive and spend their own money while a relative abroad struggled to send airtime home.
          </p>
          <p>
            We set out to build the tool that should already exist: one connected experience for accounts, cards, connectivity and bills, designed around how people actually live and move across borders.
          </p>
          <p>
            Today raviion keeps expanding that promise with more currencies, more countries and simpler ways to stay connected.
          </p>
        </div>
      </Section>

      <Section eyebrow="What we stand for" title="The principles behind every feature">
        <FeatureGrid
          items={[
            { icon: "🔒", title: "Trust first", body: "Encryption, PIN checks, fraud monitoring and verification are the base layer, not an afterthought." },
            { icon: "🌍", title: "Built for movement", body: "For students, freelancers, families and founders who live between countries and cannot afford to be cut off." },
            { icon: "⚖️", title: "Clear pricing", body: "Straightforward fees and honest rates. You keep more of what you earn." },
            { icon: "⚡", title: "Fast by default", body: "The work is behind the scenes. What you feel is a simple tap that works." },
            { icon: "🤝", title: "Built with people", body: "Agents, partners and referrals help bring raviion to the people who need it most." },
            { icon: "📈", title: "Made to last", body: "We build durable financial infrastructure that people can rely on for years." },
          ]}
        />
      </Section>

      <Section tint>
        <Stats
          items={[
            { value: "4", label: "Currencies supported" },
            { value: "190+", label: "eSIM destinations" },
            { value: "10+", label: "Bill categories" },
            { value: "1", label: "App for daily life" },
          ]}
        />
      </Section>

      <Section eyebrow="Who we are" title="A product of Topton Global Consult">
        <div className="max-w-3xl space-y-5 text-lg leading-relaxed text-indigo/70">
          <p>
            raviion is built by <strong className="text-indigo">Topton Global Consult</strong>, the team behind the technology, partnerships and standards that support the product.
          </p>
          <p>
            We are just getting started, and we would love for you to be part of it as a customer, a partner or a teammate.
          </p>
        </div>
      </Section>

      <CTA
        title="Join the next chapter of connected living"
        subtitle="Whether you want to use raviion or help build it, there is a place for you here."
        primary={{ label: "Get started", href: "/signup" }}
        secondary={{ label: "See careers", href: "/company/careers" }}
      />
    </MarketingPage>
  );
}
