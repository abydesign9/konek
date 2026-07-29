import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPage, Hero, Section, CTA } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "Konek Pricing — simple, transparent, no surprises",
  description:
    "Konek pricing is simple: free to open your account and hold multiple currencies, with clear, fair fees on cards, conversions, connectivity and bills. No hidden charges.",
  keywords: ["Konek pricing", "USD account fees", "virtual card fees", "eSIM prices", "transparent fintech pricing"],
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Konek Pricing — simple and transparent",
    description: "Free accounts, clear fees, no surprises.",
    url: "/pricing",
    type: "website",
  },
};

const TIERS = [
  {
    name: "Personal",
    tagline: "Everything for your everyday global life.",
    price: "Free",
    priceNote: "to open & hold",
    highlighted: false,
    features: [
      "USD, GBP, EUR & NGN accounts in your name",
      "Virtual cards for online spend",
      "Global eSIM, airtime, data & bills",
      "Rewards and referrals",
    ],
    cta: { label: "Get started", href: "/signup" },
  },
  {
    name: "Business",
    tagline: "Collect, pay and control — for growing teams.",
    price: "Free",
    priceNote: "to start",
    highlighted: true,
    features: [
      "Everything in Personal",
      "Multi-currency business accounts",
      "Batch payouts to staff & contractors",
      "Team cards with spend controls",
      "Roles, approvals & reporting",
    ],
    cta: { label: "Start with business", href: "/signup" },
  },
  {
    name: "Agents & Partners",
    tagline: "Earn by bringing Konek to your community.",
    price: "Earn",
    priceNote: "commission",
    highlighted: false,
    features: [
      "Sell Konek services and earn commission",
      "Invite & earn referral rewards",
      "Tools to grow your network",
      "Dedicated support",
    ],
    cta: { label: "Become an agent", href: "/signup" },
  },
];

export default function PricingPage() {
  return (
    <MarketingPage>
      <Hero
        eyebrow="Pricing"
        title={<>Simple pricing, <span className="text-konek-green">no surprises.</span></>}
        subtitle="Opening your account and holding multiple currencies is free. Where fees apply — cards, conversions, connectivity and bills — they're clear and shown before you confirm."
        primary={{ label: "Get started free", href: "/signup" }}
        secondary={{ label: "See products", href: "/personal" }}
      />

      <Section>
        <div className="grid gap-5 lg:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`rounded-3xl border p-7 ${
                t.highlighted ? "konek-card-shadow border-konek-green/30 bg-white ring-1 ring-konek-green/20" : "border-indigo/10 bg-white"
              }`}
            >
              {t.highlighted && (
                <span className="mb-3 inline-block rounded-full bg-konek-green/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-konek-green">
                  Most popular
                </span>
              )}
              <h3 className="font-heading text-xl font-bold text-indigo">{t.name}</h3>
              <p className="mt-1 text-sm text-indigo/55">{t.tagline}</p>
              <p className="mt-5 flex items-baseline gap-2">
                <span className="font-heading text-3xl font-bold text-indigo">{t.price}</span>
                <span className="text-sm text-indigo/50">{t.priceNote}</span>
              </p>
              <ul className="mt-6 flex flex-col gap-3">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm text-indigo/70">
                    <span className="mt-0.5 text-konek-green">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={t.cta.href}
                className={`mt-7 block rounded-full py-3 text-center text-sm font-semibold transition-colors ${
                  t.highlighted ? "bg-indigo text-white hover:bg-konek-green" : "border border-indigo/20 text-indigo hover:border-indigo/40"
                }`}
              >
                {t.cta.label}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 max-w-2xl text-sm text-indigo/50">
          Connectivity and bill prices (eSIM plans, airtime, data, electricity, cable, exams and gift cards) are shown live in the
          app before you pay. Conversion and card fees are always displayed before you confirm a transaction — never hidden.
        </p>
      </Section>

      <CTA
        title="Ready when you are"
        subtitle="Create your free Konek account in minutes and only pay for what you use."
        secondary={{ label: "Questions? Visit support", href: "/faq" }}
      />
    </MarketingPage>
  );
}
