import type { Metadata } from "next";
import { MarketingPage, Hero, Section, CTA } from "@/components/marketing/ui";
import { FaqList } from "./FaqList";

export const metadata: Metadata = {
  title: "raviion FAQs — answers to common questions",
  description:
    "Answers to common questions about raviion: accounts, cards, eSIM, funding, verification, security and more. Public help you can browse without signing in.",
  keywords: ["raviion FAQ", "raviion help", "how does raviion work", "raviion questions"],
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "raviion FAQs",
    description: "Answers to common questions about raviion.",
    url: "/faq",
    type: "website",
  },
};

export default function FaqPage() {
  return (
    <MarketingPage>
      <Hero
        eyebrow="FAQs"
        title={<>Questions? <span className="text-raviion-green">We&apos;ve got answers.</span></>}
        subtitle="Quick answers about accounts, cards, eSIM, funding, verification and staying secure. Browse freely — no sign-in needed."
        primary={{ label: "Visit Help Center", href: "/help" }}
        secondary={{ label: "Watch video guides", href: "/help/videos" }}
      />

      <Section>
        <FaqList />
      </Section>

      <CTA
        title="Still need a hand?"
        subtitle="Our support team is available 24/7 in the app. Log in and start a chat, and we'll take it from there."
        primary={{ label: "Get started", href: "/signup" }}
        secondary={{ label: "Help Center", href: "/help" }}
      />
    </MarketingPage>
  );
}
