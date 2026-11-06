import type { Metadata } from "next";
import { MarketingPage, Hero, Section, FeatureGrid, Stats, CTA } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "raviion Connectivity | eSIM, airtime, data and bills",
  description:
    "Stay connected anywhere with raviion: instant eSIM data in 190+ countries, airtime and data for every major network and essential bills in one place.",
  keywords: [
    "global eSIM", "buy eSIM Nigeria", "international airtime top up", "buy data online",
    "electricity token", "DStv GOtv subscription", "WAEC JAMB pin", "raviion connectivity",
  ],
  alternates: { canonical: "/connectivity" },
  openGraph: {
    title: "raviion Connectivity | eSIM, airtime, data and bills",
    description: "Global eSIM, airtime, data, international top-ups and bills in one app.",
    url: "/connectivity",
    type: "website",
  },
};

export default function ConnectivityPage() {
  return (
    <MarketingPage>
      <Hero
        eyebrow="raviion Connectivity"
        title={<>Stay online <span className="text-raviion-green">wherever you are.</span></>}
        subtitle="From your next trip to everyday essentials at home, raviion keeps you and the people you care about connected with simple, dependable access."
        primary={{ label: "Get an eSIM", href: "/signup" }}
        secondary={{ label: "See pricing", href: "/pricing" }}
      />

      <Section id="esim" eyebrow="Global eSIM" title="Land, tap, connected" intro="Choose a destination, pick a plan and activate a digital SIM without swapping your physical one. No roaming bill surprises.">
        <FeatureGrid
          items={[
            { icon: "🌍", title: "190+ countries", body: "Local, regional and global plans for wherever your journey goes — travel, study or work abroad." },
            { icon: "⚡", title: "Instant activation", body: "Buy and activate in seconds. Keep your main number for calls and texts while you browse on data." },
            { icon: "💸", title: "Pay only for what you use", body: "Right-sized plans and transparent pricing — no long contracts, no hidden roaming fees." },
          ]}
        />
      </Section>

      <Section id="bills" tint eyebrow="Airtime, data & bills" title="Everyday essentials, sorted" intro="The recharges and bills you handle every week — for every major network and provider.">
        <FeatureGrid
          items={[
            { icon: "📱", title: "Airtime & data", body: "Top up MTN, Airtel, Glo and 9mobile instantly for any number." },
            { icon: "🛰️", title: "Router & MiFi", body: "Portable internet devices and data bundles to keep your home or office online." },
            { icon: "🌐", title: "International top-up", body: "Send airtime and data to numbers abroad in a couple of taps." },
            { icon: "💡", title: "Electricity", body: "Prepaid and postpaid tokens delivered the moment you pay." },
            { icon: "📺", title: "Cable TV", body: "Renew DStv, GOtv and StarTimes without leaving the app." },
            { icon: "🎓", title: "Exam pins", body: "WAEC, NECO and JAMB pins whenever you need them." },
          ]}
        />
      </Section>

      <Section>
        <Stats
          items={[
            { value: "190+", label: "Travel eSIM destinations" },
            { value: "4", label: "Networks supported" },
            { value: "10+", label: "Bill & VAS categories" },
            { value: "24/7", label: "Buy anytime" },
          ]}
        />
      </Section>

      <CTA
        title="Never lose connection again"
        subtitle="Get connectivity and payments in one raviion account — for you and everyone you look after."
        secondary={{ label: "For personal use", href: "/personal" }}
      />
    </MarketingPage>
  );
}
