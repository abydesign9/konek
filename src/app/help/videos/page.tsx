import type { Metadata } from "next";
import { MarketingPage, Hero, Section, CTA } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "raviion Video Guides — step-by-step how-tos",
  description:
    "Watch step-by-step video guides that show you exactly how to use raviion — opening accounts, creating cards, buying eSIM, funding your wallet, verification and more.",
  keywords: ["raviion video guides", "how to use raviion", "raviion tutorials", "raviion how-to"],
  alternates: { canonical: "/help/videos" },
  openGraph: {
    title: "raviion Video Guides",
    description: "Step-by-step videos showing exactly how to use raviion.",
    url: "/help/videos",
    type: "website",
  },
};

const GUIDES = [
  { title: "Getting started with raviion", body: "Create your account, verify your identity and take your first tour of the app." },
  { title: "Opening a USD account", body: "Set up a dollar account in your name and share your details to get paid." },
  { title: "Creating & funding a virtual card", body: "Issue a card in seconds and top it up for online spend." },
  { title: "Buying & installing an eSIM", body: "Pick a plan, install your eSIM and get online in minutes." },
  { title: "Funding your wallet", body: "The ways to add money and what to expect for each." },
  { title: "Paying bills & buying airtime", body: "Electricity, cable, exams, airtime and data — done in a tap." },
];

export default function VideoGuidesPage() {
  return (
    <MarketingPage>
      <Hero
        eyebrow="Video guides"
        title={<>See exactly how <span className="text-raviion-green">it&apos;s done.</span></>}
        subtitle="Short, step-by-step videos that walk you through every part of raviion. Follow along at your own pace."
        primary={{ label: "Get started", href: "/signup" }}
        secondary={{ label: "Browse FAQs", href: "/faq" }}
      />

      <Section eyebrow="Guides" title="Popular walkthroughs">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map((g) => (
            <div key={g.title} className="raviion-card-shadow overflow-hidden rounded-2xl border border-indigo/5 bg-white">
              <div className="flex aspect-video items-center justify-center bg-indigo/5">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl raviion-card-shadow" aria-hidden>▶</span>
              </div>
              <div className="p-5">
                <h3 className="font-heading text-base font-bold text-indigo">{g.title}</h3>
                <p className="mt-1.5 text-sm text-indigo/60">{g.body}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-indigo/50">
          More guides are being added regularly. Have one you&apos;d like to see? Let us know in the app.
        </p>
      </Section>

      <CTA
        title="Ready to try it yourself?"
        subtitle="Create your raviion account and follow along with any guide."
        secondary={{ label: "Visit Help Center", href: "/help" }}
      />
    </MarketingPage>
  );
}
