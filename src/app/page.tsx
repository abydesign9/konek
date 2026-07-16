import Image from "next/image";
import Link from "next/link";
import { FloatingBadge } from "@/components/FloatingBadge";

const NAV_LINKS = [
  { label: "Ecosystem", href: "#ecosystem" },
  { label: "Who it's for", href: "#personas" },
  { label: "Business", href: "#business" },
  { label: "Security", href: "#security" },
];

const TELCOS = [
  { name: "MTN", src: "/brand/telco_mtn.png", h: "h-10" },
  { name: "Airtel", src: "/brand/telco_airtel.png", h: "h-10" },
  { name: "Glo", src: "/brand/telco_glo.png", h: "h-10" },
  { name: "9mobile", src: "/brand/telco_9mobile.png", h: "h-10" },
  { name: "DStv", src: "/brand/telco_dstv.png", h: "h-12" },
  { name: "GOtv", src: "/brand/telco_gotv.png", h: "h-5" },
  { name: "StarTimes", src: "/brand/telco_startimes.png", h: "h-12" },
];

const BUILT_FOR = [
  { emoji: "🇳🇬", label: "Nigerians" },
  { emoji: "🌍", label: "Diaspora" },
  { emoji: "💼", label: "Businesses" },
  { emoji: "👨‍💻", label: "Freelancers" },
  { emoji: "✈️", label: "Travelers" },
];

// The core positioning device: four connected pillars, not a features
// grid. This is what makes the pitch "connectivity platform" instead of
// "wallet with extras bolted on."
const ECOSYSTEM = [
  {
    label: "Global Connectivity",
    icon: "📶",
    body: "Stay connected anywhere in the world through local and international airtime, mobile data, travel eSIMs and digital communication services built for people who move across borders.",
    items: ["Airtime", "Data", "eSIM", "International top-ups"],
  },
  {
    label: "Global Financial Access",
    icon: "🌍",
    body: "Receive international payments through virtual accounts, hold a virtual card, and manage your money with tools built for a connected world.",
    items: ["Virtual accounts", "Virtual cards", "Global payments"],
  },
  {
    label: "Everyday Digital Services",
    icon: "🧾",
    body: "Handle the services that matter every day, from utility payments and subscriptions to education services and what comes next, all from one place.",
    items: ["Bills", "Utilities", "Subscriptions"],
  },
  {
    label: "Workforce Connectivity",
    icon: "📈",
    body: "Keep a team productive by delivering airtime, data, travel connectivity and digital benefits through bulk distribution and one dashboard.",
    items: ["Employee benefits", "Bulk distribution", "Dashboard", "APIs"],
  },
];

const PERSONAS = [
  {
    label: "Living Abroad",
    image: "/landing/konek_lifestyle_day.jpg",
    tagline: "Keep family connected.",
    items: ["Top up airtime", "Pay Nigerian bills", "Travel with eSIM", "Receive freelance income"],
  },
  {
    label: "Living in Africa",
    image: "/landing/konek_family_day.jpg",
    tagline: "Everything, close to home.",
    items: ["Data", "Bills", "Cards", "Dollar account", "Subscriptions"],
  },
  {
    label: "Running a Business",
    image: "/landing/konek_business_day.jpg",
    tagline: "Connectivity at scale.",
    items: ["Bulk distribution", "Corporate airtime", "Rewards", "Reports", "API"],
  },
];

const WHY_POINTS = [
  { title: "One Platform", icon: "📱", body: "No more switching apps to get through your day." },
  { title: "Instant Delivery", icon: "⚡", body: "Most services complete in seconds." },
  { title: "Built for Travel", icon: "✈️", body: "eSIM, international services and virtual cards." },
  { title: "Built for Families", icon: "👨‍👩‍👧", body: "Support loved ones from anywhere." },
  { title: "Business Ready", icon: "🏢", body: "Employee benefits, bulk operations, developer APIs." },
  { title: "Secure by Design", icon: "🔒", body: "Tiered KYC, encryption, fraud monitoring." },
];

const SHOWCASE = [
  {
    title: "Buy data anywhere",
    body: "One tap, over 200 mobile networks, plus international airtime for family back home.",
    image: "/landing/konek_app_day.jpg",
  },
  {
    title: "Get an eSIM before you travel",
    body: "Scan the code, install it, and you're connected within minutes of landing.",
    image: "/landing/konek_esim_travel.jpg",
  },
  {
    title: "Receive global payments",
    body: "USD, GBP and EUR land in your own virtual account, not someone else's.",
    image: "/landing/konek_dollar_account.jpg",
  },
  {
    title: "Spend online anywhere",
    body: "A virtual card that works for Netflix, AWS, Apple, Google, ChatGPT and everyday shopping.",
    image: "/landing/konek_rewards_day.jpg",
  },
];

const BUSINESS_CAPS = ["Employee Airtime", "Employee Data", "Corporate eSIM", "Bulk Distribution", "Rewards", "Developer API"];

const SECURITY_COLUMNS = [
  { title: "Bank-grade encryption", body: "Your data is encrypted in transit and at rest." },
  { title: "Identity verification", body: "Tiered KYC that scales with what you actually do on the platform." },
  { title: "Trusted financial partners", body: "We work only with regulated, licensed infrastructure partners." },
];

const ROADMAP_CURRENT = ["Airtime", "Data", "Bills", "eSIM"];
const ROADMAP_COMING = ["Virtual USD Accounts", "Virtual Cards", "International Bills", "Business APIs", "Payroll Benefits"];

function SectionLabel({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "gold" }) {
  return (
    <p className={`mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em] ${tone === "gold" ? "text-gold" : "text-konek-green"}`}>
      {children}
    </p>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-indigo/10 bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/brand/logo.png" alt="Konek logo" width={34} height={42} className="mix-blend-multiply" />
            <span className="font-heading text-xl font-bold text-indigo">Konek</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="text-sm font-medium text-indigo/70 transition-colors hover:text-indigo">
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-medium text-indigo/70 transition-colors hover:text-indigo sm:inline">
              Log in
            </Link>
            <Link href="/signup" className="rounded-xl bg-indigo px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo/90">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ---------- 1. Hero ---------- */}
      <section className="relative overflow-hidden bg-background">
        <div aria-hidden className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
        <div aria-hidden className="absolute bottom-0 -left-32 h-96 w-96 rounded-full bg-konek-green/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-20">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-konek-green">Global Digital Connectivity Platform</p>
            <h1 className="mb-6 font-heading text-4xl font-bold leading-[1.08] text-indigo sm:text-5xl lg:text-[3.1rem]">
              Digital Access Without Borders
            </h1>
            <p className="mb-8 max-w-lg text-lg text-indigo/70">
              From staying connected and managing everyday bills to accessing global financial tools and enabling
              workforce connectivity, KONEK gives individuals and businesses one platform for life across borders.
            </p>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="rounded-xl bg-indigo px-7 py-3.5 text-center font-semibold text-white transition-colors hover:bg-indigo/90">
                Create Free Account
              </Link>
              <a href="#ecosystem" className="rounded-xl border border-indigo/20 bg-white/60 px-7 py-3.5 text-center font-semibold text-indigo transition-colors hover:bg-white">
                See How It Works
              </a>
            </div>
            <p className="text-sm text-indigo/50">No money transfer. No hidden fees. Just the services you actually use.</p>
          </div>
          <div className="relative">
            <div className="relative aspect-[2000/1125] w-full overflow-hidden rounded-3xl shadow-2xl shadow-indigo/20">
              <Image
                src="/landing/konek_app_day.jpg"
                alt="The Konek app: home screen, send money, cards, exchange and trip planning, all in one place"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <FloatingBadge icon="📶" className="-left-5 -top-5" size="md" />
            <FloatingBadge icon="💵" className="-right-6 bottom-16" delay={0.8} size="md" />
            <FloatingBadge icon="🌍" className="-bottom-5 left-10" delay={1.6} size="md" />
          </div>
        </div>
      </section>

      {/* ---------- 2. Built for everyone ---------- */}
      <section className="border-y border-indigo/10 bg-white/60">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-indigo/50">Built for</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {BUILT_FOR.map((b) => (
              <span key={b.label} className="flex items-center gap-2 rounded-full border border-indigo/10 bg-white px-4 py-2 text-sm font-semibold text-indigo">
                <span className="text-lg">{b.emoji}</span> {b.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 3. The problem ---------- */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="mb-5 font-heading text-3xl font-bold text-indigo">Too many apps. Too many logins.</h2>
        <p className="mx-auto mb-10 max-w-2xl text-indigo/60">
          Today you need one app to buy airtime, another for an eSIM, another for a virtual dollar card, another to
          receive international payments, and another to manage business payouts. Konek brings them together into
          one platform.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-6 py-4">
            <span className="text-xl">❌</span>
            <span className="font-semibold text-red-600">Six apps</span>
          </div>
          <span className="text-2xl text-indigo/30">→</span>
          <div className="flex items-center gap-2 rounded-2xl border border-konek-green/20 bg-konek-green/10 px-6 py-4">
            <span className="text-xl">✅</span>
            <span className="font-semibold text-konek-green">One Konek app</span>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-indigo/10 bg-white/60">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-indigo/50">
            Works with the networks and services you already use
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
            {TELCOS.map((t) => (
              <Image key={t.name} src={t.src} alt={`${t.name} logo`} width={92} height={40} className={`${t.h} w-auto rounded-lg object-contain mix-blend-multiply opacity-90`} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 4. The ecosystem ---------- */}
      <section id="ecosystem" className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>One platform, four connected experiences</SectionLabel>
        <h2 className="mb-4 text-center font-heading text-3xl font-bold text-indigo">The Konek ecosystem</h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-indigo/60">
          Not four separate tools. One infrastructure that covers connectivity, money, everyday services and
          workforce distribution.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          {ECOSYSTEM.map((e) => (
            <div key={e.label} className="rounded-2xl border border-indigo/10 bg-white p-6 shadow-sm">
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-konek-green/10 text-xl">{e.icon}</span>
              <h3 className="mb-2 font-heading font-bold text-indigo">{e.label}</h3>
              <p className="mb-4 text-sm leading-relaxed text-indigo/60">{e.body}</p>
              <ul className="flex flex-wrap gap-1.5">
                {e.items.map((item) => (
                  <li key={item} className="rounded-full bg-indigo/5 px-2.5 py-1 text-xs font-medium text-indigo/70">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- 5. Built around your life ---------- */}
      <section id="personas" className="bg-white/60 border-y border-indigo/10">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Three lives, one platform</SectionLabel>
          <h2 className="mb-12 text-center font-heading text-3xl font-bold text-indigo">Built around your life</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {PERSONAS.map((persona) => (
              <div key={persona.label} className="overflow-hidden rounded-2xl border border-indigo/10 bg-white shadow-sm">
                <div className="relative aspect-[4/3] w-full">
                  <Image src={persona.image} alt={persona.label} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                </div>
                <div className="p-6">
                  <h3 className="font-heading font-bold text-indigo">{persona.label}</h3>
                  <p className="mb-3 text-sm text-konek-green">{persona.tagline}</p>
                  <ul className="flex flex-col gap-1.5">
                    {persona.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-indigo/70">
                        <span className="h-1 w-1 shrink-0 rounded-full bg-konek-green" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 6. Why people choose Konek ---------- */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel tone="gold">Six reasons, not generic ones</SectionLabel>
        <h2 className="mb-12 text-center font-heading text-3xl font-bold text-indigo">Why people choose Konek</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {WHY_POINTS.map((point) => (
            <div key={point.title} className="rounded-2xl border border-indigo/10 bg-white p-6 shadow-sm">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-xl">{point.icon}</span>
              <h3 className="mb-2 font-heading font-semibold text-indigo">{point.title}</h3>
              <p className="text-sm leading-relaxed text-indigo/70">{point.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- 7. Product showcase (alternating) ---------- */}
      <section className="bg-white/60 border-y border-indigo/10">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>See it in action</SectionLabel>
          <h2 className="mb-14 text-center font-heading text-3xl font-bold text-indigo">Every service, one app</h2>
          <div className="flex flex-col gap-16">
            {SHOWCASE.map((item, i) => (
              <div key={item.title} className={`grid items-center gap-10 md:grid-cols-2 ${i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""}`}>
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-xl shadow-indigo/10">
                  <Image src={item.image} alt={item.title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                </div>
                <div>
                  <h3 className="mb-3 font-heading text-2xl font-bold text-indigo">{item.title}</h3>
                  <p className="text-indigo/60">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 8. Business ---------- */}
      <section id="business" className="bg-indigo">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">For teams and companies</p>
              <h2 className="mb-5 font-heading text-3xl font-bold text-white">Business connectivity made simple</h2>
              <p className="mb-7 text-white/70">
                Organizations no longer need separate platforms for employee connectivity, digital service
                distribution and operational management. Konek gives your team one dashboard for delivering airtime,
                data and digital benefits at scale.
              </p>
              <ul className="mb-8 flex flex-wrap gap-2">
                {BUSINESS_CAPS.map((cap) => (
                  <li key={cap} className="rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white">{cap}</li>
                ))}
              </ul>
              <Link href="/business" className="inline-block rounded-xl bg-gold px-7 py-3.5 font-semibold text-indigo transition-colors hover:bg-gold/90">
                Explore Konek for Business
              </Link>
            </div>
            <div className="relative">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-2xl shadow-black/30">
                <Image src="/landing/konek_dashboard_day.jpg" alt="A Konek business dashboard showing revenue, expenses and recent transactions" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
              </div>
              <div className="konek-float absolute -bottom-6 -left-6 hidden w-48 overflow-hidden rounded-2xl shadow-2xl shadow-black/30 ring-4 ring-indigo sm:block">
                <div className="relative aspect-[4/3] w-full">
                  <Image src="/landing/konek_family_connectivity.jpg" alt="A family receiving airtime through Konek" fill sizes="192px" className="object-cover" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 9. Security ---------- */}
      <section id="security" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="relative order-2 aspect-square w-full max-w-sm justify-self-center md:order-1 md:justify-self-start">
            <Image src="/landing/konek_security_day.jpg" alt="A shield with a checkmark, representing Konek's security" fill sizes="(max-width: 768px) 90vw, 40vw" className="rounded-3xl object-cover" />
            <FloatingBadge icon="🔒" className="-right-3 -top-3" size="md" />
            <FloatingBadge icon="✅" className="-bottom-3 -left-3" delay={0.9} size="md" />
          </div>
          <div className="order-1 md:order-2">
            <SectionLabel>Enterprise security, everyday simplicity</SectionLabel>
            <h2 className="mb-4 font-heading text-3xl font-bold text-indigo">Secure by design</h2>
            <p className="mb-6 text-indigo/60">
              Every interaction on Konek is built around security and trust, through identity verification, fraud
              monitoring and licensed financial partners.
            </p>
            <div className="mb-6 grid gap-5 sm:grid-cols-1">
              {SECURITY_COLUMNS.map((col) => (
                <div key={col.title}>
                  <h3 className="mb-1 font-heading text-sm font-semibold text-indigo">{col.title}</h3>
                  <p className="text-xs leading-relaxed text-indigo/60">{col.body}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-konek-green/20 bg-konek-green/5 p-5">
              <h3 className="mb-1 font-heading text-sm font-semibold text-konek-green">Why no peer-to-peer transfers</h3>
              <p className="text-xs leading-relaxed text-indigo/60">
                Konek never moves money from one wallet to another. That is a deliberate design choice, not a
                missing feature. It keeps the platform focused on digital services and global payments instead of
                money remittance, so there is no transfer risk to worry about.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 10. Roadmap ---------- */}
      <section className="bg-white/60 border-y border-indigo/10">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <SectionLabel>Built in the open</SectionLabel>
          <h2 className="mb-12 text-center font-heading text-3xl font-bold text-indigo">Where we are, and what&apos;s next</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-konek-green/20 bg-konek-green/5 p-6">
              <h3 className="mb-4 font-heading font-semibold text-konek-green">Available now</h3>
              <ul className="flex flex-col gap-2.5">
                {ROADMAP_CURRENT.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm font-medium text-indigo">
                    <span className="text-konek-green">✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-gold/20 bg-gold/5 p-6">
              <h3 className="mb-4 font-heading font-semibold text-gold">Coming soon</h3>
              <ul className="flex flex-col gap-2.5">
                {ROADMAP_COMING.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm font-medium text-indigo/70">
                    <span className="text-gold">○</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-indigo px-8 py-14 text-center">
          <div aria-hidden className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-konek-green/20 blur-3xl" />
          <div aria-hidden className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
          <h2 className="relative mb-3 font-heading text-3xl font-bold text-white sm:text-4xl">One platform for a connected world</h2>
          <p className="relative mx-auto mb-8 max-w-xl text-white/70">
            Join thousands of Africans using Konek to stay connected, pay smarter and access global digital
            services. One trusted platform, not a wallet, not a workaround.
          </p>
          <div className="relative mb-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="rounded-xl bg-white px-8 py-3.5 text-center font-semibold text-indigo transition-colors hover:bg-white/90">
              Create your account
            </Link>
            <Link href="/login" className="rounded-xl border border-white/25 px-8 py-3.5 text-center font-semibold text-white transition-colors hover:bg-white/10">
              Log in
            </Link>
          </div>
          <div className="relative flex items-center justify-center gap-4 opacity-60">
            <Image src="/brand/badge_appstore.png" alt="App Store, coming soon" width={168} height={56} className="h-11 w-auto rounded-lg grayscale" />
            <Image src="/brand/badge_googleplay.png" alt="Google Play, coming soon" width={168} height={56} className="h-11 w-auto rounded-lg grayscale" />
          </div>
          <p className="relative mt-3 text-xs text-white/50">Native apps coming soon</p>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="bg-indigo text-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="mb-10 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <p className="mb-2 font-heading text-2xl font-bold">Konek</p>
              <p className="text-sm text-white/60">A digital connectivity platform for life across borders.</p>
            </div>
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-white/40">Company</p>
              <ul className="flex flex-col gap-2.5 text-sm text-white/70">
                <li><a href="#about" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="mailto:support@konek.app" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-white/40">Ecosystem</p>
              <ul className="flex flex-col gap-2.5 text-sm text-white/70">
                <li><a href="#ecosystem" className="hover:text-white">Global connectivity</a></li>
                <li><a href="#ecosystem" className="hover:text-white">Global financial access</a></li>
                <li><a href="#ecosystem" className="hover:text-white">Everyday digital services</a></li>
                <li><a href="#business" className="hover:text-white">Workforce connectivity</a></li>
              </ul>
            </div>
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-white/40">Legal</p>
              <ul className="flex flex-col gap-2.5 text-sm text-white/70">
                <li><Link href="/terms" className="hover:text-white">Terms of use</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row">
            <p>
              <a href="mailto:support@konek.app" className="hover:text-white">support@konek.app</a>
              {" "}·{" "}
              <a href="#" className="hover:text-white">WhatsApp support</a>
            </p>
            <p>© {new Date().getFullYear()} Konek. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
