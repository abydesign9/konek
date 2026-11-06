import type { Metadata } from "next";
import { MarketingPage, Hero, Section, FeatureGrid, Stats, CTA } from "@/components/marketing/ui";
import { ApplicationForm } from "@/components/marketing/ApplicationForm";

export const metadata: Metadata = {
  title: "raviion Campus Ambassadors — represent raviion and get paid",
  description:
    "Join the raviion Campus Ambassador program: represent raviion at your school, help students go global with accounts, cards and eSIM, build real career skills and earn as you grow.",
  keywords: ["raviion campus ambassador", "student ambassador program Nigeria", "brand ambassador fintech", "campus rep"],
  alternates: { canonical: "/ambassadors" },
  openGraph: {
    title: "raviion Campus Ambassadors",
    description: "Represent raviion on campus, build skills, and earn.",
    url: "/ambassadors",
    type: "website",
  },
};

export default function AmbassadorsPage() {
  return (
    <MarketingPage>
      <Hero
        eyebrow="Campus Ambassadors"
        title={<>Lead raviion <span className="text-raviion-green">on your campus.</span></>}
        subtitle="Be the face of raviion at your school. Help fellow students open accounts, get cards and stay connected — gain real-world career skills, grow your network, and earn while you do it."
        primary={{ label: "Apply now", href: "#apply" }}
        secondary={{ label: "See referrals", href: "/referrals" }}
      />

      <Section eyebrow="Why join" title="More than a side hustle">
        <FeatureGrid
          items={[
            { icon: "💼", title: "Career skills", body: "Grow real skills in marketing, sales, community and leadership that stand out to future employers." },
            { icon: "🤝", title: "A powerful network", body: "Connect with ambassadors across campuses and with the raviion team building a fast-growing company." },
            { icon: "💰", title: "Earn as you grow", body: "Get rewarded for the students you bring on and the community you build — paid to your wallet." },
            { icon: "🎓", title: "Exclusive access", body: "Early looks at new features, ambassador-only perks, merch and events." },
            { icon: "📣", title: "A platform", body: "Build your personal brand as a campus leader with the backing of raviion." },
            { icon: "🚀", title: "Room to rise", body: "Standout ambassadors get first shot at internships, roles and bigger opportunities with us." },
          ]}
        />
      </Section>

      <Section tint eyebrow="What you'll do" title="Your role as an ambassador">
        <div className="max-w-2xl space-y-4 text-lg leading-relaxed text-indigo/70">
          <p>
            Ambassadors are raviion&apos;s voice on campus. You&apos;ll introduce students to accounts, cards and eSIM,
            run small activations and share how raviion makes global money and connectivity simple.
          </p>
          <p>
            It&apos;s flexible and fits around your studies — a few hours a week, your own style, with support,
            materials and a community behind you every step of the way.
          </p>
        </div>
      </Section>

      <Section>
        <Stats
          items={[
            { value: "Skills", label: "For your CV" },
            { value: "Network", label: "Across campuses" },
            { value: "Earn", label: "As you grow" },
            { value: "Perks", label: "Ambassador-only" },
          ]}
        />
      </Section>

      <Section id="apply" tint eyebrow="Apply" title="Start your ambassador application">
        <ApplicationForm program="ambassador" />
      </Section>

      <CTA
        title="Have a question first?"
        subtitle="Visit our Help Center or explore the referral program while you decide."
        primary={{ label: "Visit Help Center", href: "/help" }}
        secondary={{ label: "Influencer program", href: "/influencers" }}
      />
    </MarketingPage>
  );
}
