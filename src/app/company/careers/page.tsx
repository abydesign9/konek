import type { Metadata } from "next";
import { MarketingPage, Hero, Section, FeatureGrid, CTA } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "Careers at Konek — build connectivity for a continent",
  description:
    "Join Konek and help build the connectivity and payments layer for Africans at home and abroad. See our culture, values and how to express interest in joining the team.",
  keywords: ["Konek careers", "fintech jobs Africa", "work at Konek", "Topton Global Consult careers"],
  alternates: { canonical: "/company/careers" },
  openGraph: {
    title: "Careers at Konek",
    description: "Build the connectivity layer for a continent.",
    url: "/company/careers",
    type: "website",
  },
};

export default function CareersPage() {
  return (
    <MarketingPage>
      <Hero
        eyebrow="Careers"
        title={<>Build the connectivity layer <span className="text-konek-green">for a continent.</span></>}
        subtitle="We're a small, ambitious team solving problems that touch millions of lives. If you want your work to matter — and to ship — Konek is a place to do it."
        primary={{ label: "Express interest", href: "/support" }}
        secondary={{ label: "About Konek", href: "/about" }}
      />

      <Section eyebrow="Life at Konek" title="Why people build here">
        <FeatureGrid
          items={[
            { icon: "🎯", title: "Real impact", body: "Every feature removes a genuine barrier for someone living, working or studying across borders." },
            { icon: "🚀", title: "Ship fast", body: "Small team, high trust, short path from idea to production. Your work reaches users quickly." },
            { icon: "🌍", title: "Global by default", body: "We build for people on the move, and we work like it — pragmatic, async and outcome-focused." },
            { icon: "🧠", title: "Grow quickly", body: "Ownership from day one, real responsibility, and the room to stretch into it." },
            { icon: "🔒", title: "High standards", body: "Money and trust are on the line. We hold a high bar for security, quality and care." },
            { icon: "🤝", title: "Good people", body: "Kind, direct and driven. We take the work seriously without taking ourselves too seriously." },
          ]}
        />
      </Section>

      <Section tint eyebrow="Open roles" title="Don't see your role yet?">
        <div className="max-w-2xl space-y-5 text-lg leading-relaxed text-indigo/70">
          <p>
            We&apos;re growing carefully and open new roles across engineering, product, design, operations,
            compliance and growth as we scale. If you believe you can help build Konek, we want to hear from you
            — even if there isn&apos;t a posting with your exact title today.
          </p>
          <p>
            Tell us who you are, what you&apos;re great at, and the kind of problem you&apos;d love to own. The best
            introductions show us something you&apos;ve made.
          </p>
        </div>
      </Section>

      <CTA
        title="Introduce yourself"
        subtitle="Send us a note about how you'd like to contribute — we read every one."
        primary={{ label: "Get in touch", href: "/support" }}
        secondary={{ label: "Read our story", href: "/about" }}
      />
    </MarketingPage>
  );
}
