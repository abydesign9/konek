import Image from "next/image";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Platform", href: "#platform" },
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

// Section 2 — six categories, not four. "Send Value" and "Receive
// Globally"/"Spend Online" are deliberately separate cards even though
// they're both "money" — the brief's point is that this reads as a
// platform with breadth, not a wallet with a top-up button bolted on.
const PLATFORM_PILLARS = [
  { title: "Stay Connected", icon: "📶", items: ["Airtime", "Data", "eSIM"], blurb: "Every network, everywhere you go." },
  { title: "Pay Bills", icon: "🧾", items: ["Electricity", "Cable", "Internet", "Utilities"], blurb: "Everyday essentials, handled in seconds." },
  { title: "Send Value", icon: "⚡", items: ["Top up anyone", "Anywhere", "Instantly"], blurb: "Not money — value, delivered directly." },
  { title: "Receive Globally", icon: "🌍", items: ["USD", "GBP", "EUR"], blurb: "Into your own virtual accounts." },
  { title: "Spend Online", icon: "💳", items: ["Netflix", "AWS", "Apple", "Google", "ChatGPT"], blurb: "A virtual dollar card built for the internet." },
  { title: "Grow Your Business", icon: "📈", items: ["Bulk airtime", "Bulk data", "Rewards", "Employee benefits"], blurb: "One platform for your whole team." },
];

const PERSONAS = [
  {
    label: "Living Abroad",
    image: "/landing/konek_lifestyle_day.jpg",
    items: ["Top up family", "Pay Nigerian bills", "Travel with eSIM", "Receive freelance income", "Spend globally"],
  },
  {
    label: "Living in Africa",
    image: "/landing/konek_family_day.jpg",
    items: ["Buy airtime", "Data", "Bills", "USD account", "Virtual card", "Online payments"],
  },
  {
    label: "Businesses",
    image: "/landing/konek_business_day.jpg",
    items: ["Bulk airtime", "Employee benefits", "Corporate eSIM", "Rewards", "API"],
  },
];

const ECOSYSTEM = [
  { label: "Connectivity", icon: "📶", items: ["Airtime", "Data", "eSIM"] },
  { label: "Payments", icon: "🧾", items: ["Bills", "Utilities", "Rewards"] },
  { label: "Global", icon: "🌍", items: ["USD Account", "Virtual Cards"] },
  { label: "Business", icon: "📈", items: ["Bulk Distribution", "Payroll Benefits", "API"] },
];

const HOW_STEPS = [
  { n: "1", title: "Create Account", body: "Your phone number is all it takes to get started." },
  { n: "2", title: "Fund Wallet", body: "Card, bank transfer, or a dedicated virtual account." },
  { n: "3", title: "Choose Any Service", body: "Airtime, bills, eSIM, USD account — whatever you need." },
  { n: "4", title: "Done", body: "It lands in seconds. No paperwork, no waiting." },
];

const LOVE_POINTS = [
  { title: "One App", icon: "📱", body: "Instead of five. Everything that keeps you connected, in one place." },
  { title: "No Remittance Stress", icon: "🛡️", body: "No money transfers. You pay directly, so there's no transfer risk." },
  { title: "Built For Travel", icon: "✈️", body: "eSIM, cards, bills, connectivity — land and go." },
  { title: "Built For Families", icon: "👨‍👩‍👧", body: "Top up parents. Pay school bills. Send utilities." },
  { title: "Built For Freelancers", icon: "💰", body: "Receive USD. Spend globally. Convert to naira." },
  { title: "Built For Businesses", icon: "🏢", body: "Bulk payments. Employee benefits. Corporate eSIM." },
];

const BUSINESS_CAPS = [
  "Employee Airtime",
  "Employee Data",
  "Corporate eSIM",
  "Bulk Distribution",
  "Rewards",
  "Developer APIs",
  "Payroll Benefits",
];

const SECURITY_POINTS = [
  { title: "Tiered KYC", body: "Verification scales with what you do — nothing heavier than it needs to be." },
  { title: "Fraud Protection", body: "Every transaction is watched for velocity and risk in real time." },
  { title: "3DS", body: "Card payments are protected by 3D Secure at checkout." },
  { title: "Encryption", body: "Your data is encrypted in transit and at rest." },
  { title: "Licensed Partners", body: "We work only with regulated, licensed financial partners." },
  { title: "No Peer-to-Peer Transfers", body: "Konek never moves money between wallets — so there's no transfer risk to exploit." },
];

const ROADMAP_CURRENT = ["Airtime", "Data", "Bills", "eSIM"];
const ROADMAP_COMING = ["USD Accounts", "Virtual Cards", "International Bills", "Business APIs", "Payroll"];

const TESTIMONIALS = [
  {
    quote: "I send data to my mum every week now. It lands before we even hang up the phone.",
    name: "Ada O.",
    location: "London",
    avatar: "/brand/avatar_2.png",
  },
  {
    quote:
      "My card kept declining for international payments until I opened a dollar account on Konek. Works every time now.",
    name: "Chidi E.",
    location: "Lagos",
    avatar: "/brand/avatar_3.png",
  },
  {
    quote: "I landed in Dubai and had data before I left the airport. That is the whole point.",
    name: "Bola A.",
    location: "Dubai",
    avatar: "/brand/avatar_4.png",
  },
];

function SectionLabel({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "gold" }) {
  return (
    <p
      className={`mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em] ${
        tone === "gold" ? "text-gold" : "text-konek-green"
      }`}
    >
      {children}
    </p>
  );
}

// A small emoji badge that bobs gently — the recurring "floating icon"
// motif the brief asked for, used instead of dense paragraphs wherever a
// single glance can carry the idea (connectivity, family, money, travel).
function FloatingBadge({
  icon,
  className,
  delay = 0,
  size = "md",
}: {
  icon: string;
  className?: string;
  delay?: number;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "lg" ? "h-16 w-16 text-2xl" : size === "sm" ? "h-9 w-9 text-sm" : "h-12 w-12 text-lg";
  return (
    <div
      className={`konek-float absolute z-10 flex ${dims} items-center justify-center rounded-full bg-white konek-card-shadow ${className ?? ""}`}
      style={{ animationDelay: `${delay}s` }}
      aria-hidden
    >
      {icon}
    </div>
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

      {/* ---------- Section 1: Hero (light — the image supplies the drama) ---------- */}
      <section className="relative overflow-hidden bg-background">
        <div aria-hidden className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
        <div aria-hidden className="absolute bottom-0 -left-32 h-96 w-96 rounded-full bg-konek-green/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-20">
          <div>
            <h1 className="mb-6 font-heading text-4xl font-bold leading-[1.08] text-indigo sm:text-5xl lg:text-[3.2rem]">
              Stay Connected. <span className="text-gold">Spend Globally.</span> Live Without Borders.
            </h1>
            <p className="mb-8 max-w-lg text-lg text-indigo/70">
              KONEK brings together international top-ups, eSIMs, global bill payments, virtual dollar accounts,
              cards, and everyday digital services into one simple platform for Africans at home and abroad.
            </p>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="rounded-xl bg-indigo px-7 py-3.5 text-center font-semibold text-white transition-colors hover:bg-indigo/90"
              >
                Create Free Account
              </Link>
              <a
                href="#platform"
                className="rounded-xl border border-indigo/20 bg-white/60 px-7 py-3.5 text-center font-semibold text-indigo transition-colors hover:bg-white"
              >
                Explore Products
              </a>
            </div>
            <p className="text-sm text-indigo/50">No money transfer. No hidden fees. Just the services you actually use.</p>
          </div>
          <div className="relative">
            <div className="relative aspect-[2000/1125] w-full overflow-hidden rounded-3xl shadow-2xl shadow-indigo/20">
              <Image
                src="/landing/konek_hero_image.jpg"
                alt="The Konek app connecting a phone to family, money, travel, bills, eSIM and card — one world, one Konek"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <FloatingBadge icon="📶" className="-left-5 -top-5" size="md" />
            <FloatingBadge icon="👨‍👩‍👧" className="-right-4 top-8" delay={0.6} size="lg" />
            <FloatingBadge icon="💵" className="-right-6 bottom-16" delay={1.2} size="md" />
            <FloatingBadge icon="✈️" className="-bottom-5 left-10" delay={1.8} size="md" />
            <FloatingBadge icon="💳" className="bottom-1/3 -left-6" delay={2.4} size="sm" />
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
              <Image
                key={t.name}
                src={t.src}
                alt={`${t.name} logo`}
                width={92}
                height={40}
                className={`${t.h} w-auto rounded-lg object-contain mix-blend-multiply opacity-90`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Section 2: Everything you need. One platform. ---------- */}
      <section id="platform" className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>All the everyday digital services you need</SectionLabel>
        <h2 className="mb-4 text-center font-heading text-3xl font-bold text-indigo">Everything you need. One platform.</h2>
        <p className="mx-auto mb-8 max-w-2xl text-center text-indigo/60">
          Not four products bolted together — six ways Konek shows up in your everyday life.
        </p>

        <div className="relative mb-10 overflow-hidden rounded-3xl shadow-xl shadow-indigo/10">
          <div className="relative aspect-[2000/1125] w-full">
            <Image src="/landing/konek_app_day.jpg" alt="The Konek app: send money, cards, exchange and trip planning screens" fill sizes="(max-width: 768px) 100vw, 1000px" className="object-cover" />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_PILLARS.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-indigo/10 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-konek-green/10 text-xl">{p.icon}</span>
              <h3 className="mb-1.5 font-heading font-semibold text-indigo">{p.title}</h3>
              <p className="mb-4 text-sm text-indigo/60">{p.blurb}</p>
              <ul className="flex flex-wrap gap-1.5">
                {p.items.map((item) => (
                  <li key={item} className="rounded-full bg-indigo/5 px-2.5 py-1 text-xs font-medium text-indigo/70">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Section 3: Built for modern Africans ---------- */}
      <section id="personas" className="bg-white/60 border-y border-indigo/10">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Three lives, one platform</SectionLabel>
          <h2 className="mb-12 text-center font-heading text-3xl font-bold text-indigo">Built for modern Africans</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {PERSONAS.map((persona) => (
              <div key={persona.label} className="overflow-hidden rounded-2xl border border-indigo/10 bg-white shadow-sm">
                <div className="relative aspect-[4/3] w-full">
                  <Image src={persona.image} alt={persona.label} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                </div>
                <div className="p-6">
                  <h3 className="mb-3 font-heading font-bold text-indigo">{persona.label}</h3>
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

      {/* ---------- Section 4: Why KONEK exists (light — the map is a framed visual, not a backdrop) ---------- */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-xl shadow-indigo/10">
            <Image src="/landing/konek_world_map.jpg" alt="A world map showing Konek connecting Lagos, London, Dubai, New York and more" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
            <FloatingBadge icon="🌍" className="-right-4 -top-4" size="lg" />
            <FloatingBadge icon="📍" className="-bottom-4 -left-4" delay={0.8} />
          </div>
          <div>
            <p className="mb-5 text-xl font-medium text-indigo sm:text-2xl">Millions of Africans live between two worlds.</p>
            <p className="mb-6 text-indigo/60">
              You work in one country. Your family lives in another. You travel, pay bills, buy data, and receive
              international payments — all across borders. Today, that means five or six different apps.
            </p>
            <p className="font-heading text-2xl font-bold text-konek-green">
              KONEK brings everything together into one trusted platform.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Section 5: Product ecosystem ---------- */}
      <section className="bg-white/60 border-y border-indigo/10">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <SectionLabel>How it fits together</SectionLabel>
          <h2 className="mb-14 text-center font-heading text-3xl font-bold text-indigo">One ecosystem, not four apps</h2>
          <div className="flex flex-col items-center">
            <div className="rounded-2xl bg-indigo px-8 py-4 font-heading text-xl font-bold text-white shadow-lg shadow-indigo/20">
              KONEK
            </div>
            <div className="h-10 w-px bg-indigo/20" />
            <div className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {ECOSYSTEM.map((branch) => (
                <div key={branch.label} className="flex flex-col items-center">
                  <div className="mb-4 h-6 w-px bg-indigo/20 sm:block" />
                  <div className="w-full rounded-2xl border border-indigo/10 bg-white p-5 text-center shadow-sm">
                    <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-konek-green/10 text-lg">
                      {branch.icon}
                    </span>
                    <p className="mb-3 font-heading font-semibold text-konek-green">{branch.label}</p>
                    <ul className="flex flex-col gap-1.5">
                      {branch.items.map((item) => (
                        <li key={item} className="text-sm text-indigo/70">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Section 6: How KONEK works ---------- */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>Get started in minutes</SectionLabel>
        <h2 className="mb-12 text-center font-heading text-3xl font-bold text-indigo">How KONEK works</h2>
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-xl shadow-indigo/10">
            <Image src="/landing/konek_dollar_account.jpg" alt="Konek dashboard open on a laptop showing a received USD payment" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
            <FloatingBadge icon="✅" className="-right-4 -top-4" size="md" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {HOW_STEPS.map((step) => (
              <div key={step.n} className="rounded-2xl border border-indigo/10 bg-white p-5 shadow-sm">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-konek-green font-heading font-bold text-white">
                  {step.n}
                </div>
                <h3 className="mb-1.5 font-heading font-semibold text-indigo">{step.title}</h3>
                <p className="text-sm text-indigo/70">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Section 7: Why people love KONEK ---------- */}
      <section className="bg-white/60 border-y border-indigo/10">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel tone="gold">Not fast. Not secure. Not reliable.</SectionLabel>
          <h2 className="mb-12 text-center font-heading text-3xl font-bold text-indigo">Why people love KONEK</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {LOVE_POINTS.map((point) => (
              <div key={point.title} className="rounded-2xl border border-indigo/10 bg-white p-6 shadow-sm">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-xl">{point.icon}</span>
                <h3 className="mb-2 font-heading font-semibold text-indigo">{point.title}</h3>
                <p className="text-sm leading-relaxed text-indigo/70">{point.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Section 8: Business ---------- */}
      <section id="business" className="bg-indigo">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">For teams and companies</p>
            <h2 className="mb-5 font-heading text-3xl font-bold text-white">Power your business with KONEK</h2>
            <p className="mb-7 text-white/70">
              Bulk airtime and data for your whole team, corporate eSIM for traveling staff, and a developer API to
              build connectivity into your own product.
            </p>
            <ul className="mb-8 flex flex-wrap gap-2">
              {BUSINESS_CAPS.map((cap) => (
                <li key={cap} className="rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white">
                  {cap}
                </li>
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
                <Image src="/landing/konek_business_day.jpg" alt="A business owner sending bulk airtime to employees" fill sizes="192px" className="object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Section 9: Security ---------- */}
      <section id="security" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="relative order-2 aspect-square w-full max-w-sm justify-self-center md:order-1 md:justify-self-start">
            <Image src="/landing/konek_security_day.jpg" alt="A shield with a checkmark, representing Konek's security" fill sizes="(max-width: 768px) 90vw, 40vw" className="rounded-3xl object-cover" />
            <FloatingBadge icon="🔒" className="-right-3 -top-3" size="md" />
            <FloatingBadge icon="✅" className="-bottom-3 -left-3" delay={0.9} size="md" />
          </div>
          <div className="order-1 md:order-2">
            <SectionLabel>Built to be trusted</SectionLabel>
            <h2 className="mb-6 font-heading text-3xl font-bold text-indigo">Security isn't a footnote here</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {SECURITY_POINTS.map((point) => (
                <div key={point.title}>
                  <h3 className="mb-1 font-heading text-sm font-semibold text-indigo">{point.title}</h3>
                  <p className="text-xs leading-relaxed text-indigo/60">{point.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Section 10: Roadmap ---------- */}
      <section className="bg-white/60 border-y border-indigo/10">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <SectionLabel>Built in the open</SectionLabel>
          <h2 className="mb-12 text-center font-heading text-3xl font-bold text-indigo">Where we are, and what's next</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-konek-green/20 bg-konek-green/5 p-6">
              <h3 className="mb-4 font-heading font-semibold text-konek-green">Live today</h3>
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

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>What people are saying</SectionLabel>
        <h2 className="mb-12 text-center font-heading text-3xl font-bold text-indigo">Home and abroad, already konekted</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="flex flex-col rounded-2xl border border-indigo/10 bg-white p-6 shadow-sm">
              <blockquote className="mb-6 flex-1 leading-relaxed text-indigo/80">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="flex items-center gap-3">
                <Image src={t.avatar} alt={`Portrait of ${t.name}`} width={44} height={44} className="rounded-full" />
                <div>
                  <p className="text-sm font-semibold text-indigo">{t.name}</p>
                  <p className="text-xs text-indigo/50">{t.location}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ---------- Section 11: Final CTA ---------- */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-indigo px-8 py-14 text-center">
          <div aria-hidden className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-konek-green/20 blur-3xl" />
          <div aria-hidden className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
          <h2 className="relative mb-3 font-heading text-3xl font-bold text-white sm:text-4xl">
            Everything that keeps you connected.
          </h2>
          <p className="relative mb-8 text-white/70">One trusted platform. Create your free account today.</p>
          <div className="relative mb-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="rounded-xl bg-white px-8 py-3.5 text-center font-semibold text-indigo transition-colors hover:bg-white/90">
              Create your account
            </Link>
            <Link href="/login" className="rounded-xl border border-white/25 px-8 py-3.5 text-center font-semibold text-white transition-colors hover:bg-white/10">
              Log in
            </Link>
          </div>
          <div className="relative flex items-center justify-center gap-4 opacity-60">
            <Image src="/brand/badge_appstore.png" alt="App Store — coming soon" width={168} height={56} className="h-11 w-auto rounded-lg grayscale" />
            <Image src="/brand/badge_googleplay.png" alt="Google Play — coming soon" width={168} height={56} className="h-11 w-auto rounded-lg grayscale" />
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
              <p className="text-sm text-white/60">Stay connected. Spend globally. Live without borders.</p>
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
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-white/40">Platform</p>
              <ul className="flex flex-col gap-2.5 text-sm text-white/70">
                <li><a href="#platform" className="hover:text-white">Connectivity</a></li>
                <li><a href="#platform" className="hover:text-white">Payments</a></li>
                <li><a href="#platform" className="hover:text-white">Global accounts</a></li>
                <li><a href="#business" className="hover:text-white">Business</a></li>
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
              {" · "}
              <a href="#" className="hover:text-white">WhatsApp support</a>
            </p>
            <p>© {new Date().getFullYear()} Konek. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
