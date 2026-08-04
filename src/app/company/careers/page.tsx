import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPage, Hero, Section, FeatureGrid, CTA } from "@/components/marketing/ui";

const ROLES = [
  { team: "Engineering", title: "Software Engineers (Frontend, Backend, Mobile)", type: "Full-time · Hybrid / Remote", body: "Build reliable, secure product surfaces across the Konek app and platform." },
  { team: "Product & Design", title: "Product Manager · Product Designer", type: "Full-time · Hybrid / Remote", body: "Shape features that remove real barriers for people living across borders." },
  { team: "Compliance & Risk", title: "Compliance / KYC & Risk Analyst", type: "Full-time · Hybrid", body: "Keep Konek safe and compliant as we scale across markets." },
  { team: "Operations", title: "Customer & Payment Operations", type: "Full-time · Hybrid / Remote", body: "Deliver fast, caring support and smooth money movement for customers." },
  { team: "Growth & Marketing", title: "Growth · Content · Community", type: "Full-time · Hybrid / Remote", body: "Tell the Konek story and grow our community of users and partners." },
  { team: "Partnerships", title: "Partnerships & Business Development", type: "Full-time · Hybrid", body: "Build the vendor, agent and provider relationships that power Konek." },
];

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
        primary={{ label: "Express interest", href: "/help" }}
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

      <Section tint eyebrow="Open roles" title="Where we're hiring" intro="We open roles across these teams as we grow. Don't see your exact title? We still want to hear from you.">
        <div className="grid gap-4 sm:grid-cols-2">
          {ROLES.map((r) => (
            <div key={r.title} className="konek-card-shadow flex flex-col rounded-2xl border border-indigo/5 bg-white p-6">
              <span className="mb-2 inline-block w-fit rounded-full bg-konek-green/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-konek-green">
                {r.team}
              </span>
              <h3 className="font-heading text-lg font-bold text-indigo">{r.title}</h3>
              <p className="mt-1 text-xs font-semibold text-indigo/45">{r.type}</p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-indigo/60">{r.body}</p>
              <Link href="/help" className="mt-4 text-sm font-semibold text-konek-green hover:text-indigo">Express interest →</Link>
            </div>
          ))}
        </div>
        <p className="mt-8 max-w-2xl text-sm text-indigo/55">
          Tell us who you are, what you&apos;re great at, and the kind of problem you&apos;d love to own. The best
          introductions show us something you&apos;ve made.
        </p>
      </Section>

      <CTA
        title="Introduce yourself"
        subtitle="Send us a note about how you'd like to contribute — we read every one."
        primary={{ label: "Get in touch", href: "/help" }}
        secondary={{ label: "Read our story", href: "/about" }}
      />
    </MarketingPage>
  );
}
