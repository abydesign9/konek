import Image from "next/image";
import Link from "next/link";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Products", href: "#products" },
  { label: "About", href: "#about" },
  { label: "Support", href: "#faq" },
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

const PRODUCTS = [
  {
    icon: "/brand/icon_airtime2.png",
    title: "Local top up and bills",
    body: "Airtime, data, cable TV and electricity, paid in seconds from your Konek wallet.",
  },
  {
    icon: "/brand/icon_intl.png",
    title: "International top up",
    body: "Send airtime and data straight to a loved one's phone in Nigeria, from anywhere in the world.",
  },
  {
    icon: "/brand/icon_esim2.png",
    title: "eSIM",
    body: "Get connected the moment you land. Local, regional and global data plans, activated in seconds.",
  },
  {
    icon: "/brand/icon_card.png",
    title: "Dollar account and card",
    body: "A real USD account and virtual card, so you can receive and spend without needing a foreign bank.",
  },
];

const WHY_POINTS = [
  {
    icon: "/brand/why_wallet.png",
    title: "One wallet, both sides of your life",
    body: "Whether you are sending from abroad or spending at home, it is the same wallet, the same app.",
  },
  {
    icon: "/brand/why_shield.png",
    title: "No money transfer risk",
    body: "Konek never moves money from one wallet to another. You top up services directly, so there is no transfer risk to worry about.",
  },
  {
    icon: "/brand/why_instant.png",
    title: "Instant, every time",
    body: "Top ups and bill payments land in seconds, not hours.",
  },
  {
    icon: "/brand/why_global.png",
    title: "Built for Nigerians, wherever you are",
    body: "Local currency at home, hard currency abroad, one app that understands both.",
  },
];

const STEPS = [
  { n: "1", title: "Sign up", body: "Create your account with your phone number or email." },
  { n: "2", title: "Verify your identity", body: "A quick check when you are ready to fund your wallet." },
  { n: "3", title: "Start using Konek", body: "Top up, pay bills, buy an eSIM or open your dollar account." },
];

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

const FAQS = [
  {
    q: "How do I fund my Konek wallet",
    a: "Add money using your card, bank transfer, or a dedicated virtual account in your name.",
  },
  {
    q: "Does Konek support sending money to another person's bank account",
    a: "No. Konek does not offer money transfer. You use your wallet to pay directly for airtime, data, bills, eSIM plans and your dollar account, which keeps your funds secure and avoids transfer risk entirely.",
  },
  {
    q: "What documents do I need to sign up",
    a: "Just your phone number or email to get started. You will verify your identity with a government ID once you are ready to fund your wallet.",
  },
  {
    q: "How fast do top ups arrive",
    a: "Almost always within seconds of payment.",
  },
  {
    q: "Is my money safe with Konek",
    a: "Yes. Your wallet balance is held securely and every transaction is logged and traceable.",
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-konek-green text-center mb-3">
      {children}
    </p>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background border-b border-indigo/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/logo.png"
              alt="Konek logo"
              width={34}
              height={42}
              className="mix-blend-multiply"
            />
            <span className="font-heading text-xl font-bold text-indigo">Konek</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-indigo/70 hover:text-indigo transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline text-sm font-medium text-indigo/70 hover:text-indigo transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-indigo text-white text-sm font-semibold px-5 py-2.5 hover:bg-indigo/90 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-konek-green/10 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute top-64 -left-32 w-96 h-96 rounded-full bg-gold/10 blur-3xl"
        />
        <div className="relative max-w-6xl mx-auto px-6 pt-14 pb-16 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-[3.4rem] font-bold text-indigo leading-[1.08] mb-6">
              One wallet for home and abroad
            </h1>
            <p className="text-lg text-indigo/70 mb-8 max-w-lg">
              Top up family, buy data, get an eSIM, and open a dollar account, all without the risk
              of a money transfer app.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <Link
                href="/signup"
                className="rounded-xl bg-indigo text-white text-center font-semibold px-7 py-3.5 hover:bg-indigo/90 transition-colors"
              >
                Get started free
              </Link>
              <a
                href="#how-it-works"
                className="rounded-xl border border-indigo/20 bg-white/60 text-indigo text-center font-semibold px-7 py-3.5 hover:bg-white transition-colors"
              >
                See how it works
              </a>
            </div>
            <p className="text-sm text-indigo/50">
              No money transfer. No hidden fees. Just the services you actually use.
            </p>
          </div>
          <div className="relative">
            <Image
              src="/brand/hero_mockup.png"
              alt="The Konek app showing a naira wallet, top-up buttons and recent transactions"
              width={900}
              height={506}
              priority
              className="rounded-3xl shadow-2xl shadow-indigo/20"
            />
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-indigo/10 bg-white/60">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-indigo/50 mb-6">
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

      {/* Core products */}
      <section id="products" className="max-w-6xl mx-auto px-6 py-20">
        <SectionLabel>What you can do on Konek</SectionLabel>
        <h2 className="font-heading text-3xl font-bold text-indigo text-center mb-12">
          Everything, one wallet
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PRODUCTS.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl bg-white border border-indigo/10 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <Image src={p.icon} alt="" width={64} height={64} className="mb-5" />
              <h3 className="font-heading font-semibold text-indigo mb-2">{p.title}</h3>
              <p className="text-sm text-indigo/70 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Konek */}
      <section className="bg-indigo">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold text-center mb-3">
            Why people choose Konek
          </p>
          <h2 className="font-heading text-3xl font-bold text-white text-center mb-12">
            Built around one simple promise
          </h2>
          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-10">
            {WHY_POINTS.map((point) => (
              <div key={point.title} className="flex gap-5">
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-white flex items-center justify-center">
                  <Image src={point.icon} alt="" width={36} height={36} />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-white mb-1.5">{point.title}</h3>
                  <p className="text-sm text-white/70 leading-relaxed">{point.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
        <SectionLabel>Get started in minutes</SectionLabel>
        <h2 className="font-heading text-3xl font-bold text-indigo text-center mb-12">
          Three steps, no paperwork up front
        </h2>
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          {STEPS.map((step) => (
            <div key={step.n} className="rounded-2xl bg-white border border-indigo/10 p-6 shadow-sm">
              <div className="w-9 h-9 rounded-full bg-konek-green text-white font-heading font-bold flex items-center justify-center mb-4">
                {step.n}
              </div>
              <h3 className="font-heading font-semibold text-indigo mb-2">{step.title}</h3>
              <p className="text-sm text-indigo/70">{step.body}</p>
            </div>
          ))}
        </div>
        <Image
          src="/brand/how_it_works.png"
          alt="Konek onboarding: create your account, verify your identity, and land on your wallet home screen"
          width={1600}
          height={1600}
          className="rounded-3xl border border-indigo/10 shadow-sm"
        />
      </section>

      {/* Testimonials */}
      <section className="bg-white/60 border-y border-indigo/10">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <SectionLabel>What people are saying</SectionLabel>
          <h2 className="font-heading text-3xl font-bold text-indigo text-center mb-12">
            Home and abroad, already konekted
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.name}
                className="rounded-2xl bg-white border border-indigo/10 p-6 shadow-sm flex flex-col"
              >
                <blockquote className="text-indigo/80 leading-relaxed mb-6 flex-1">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="flex items-center gap-3">
                  <Image
                    src={t.avatar}
                    alt={`Portrait of ${t.name}`}
                    width={44}
                    height={44}
                    className="rounded-full"
                  />
                  <div>
                    <p className="text-sm font-semibold text-indigo">{t.name}</p>
                    <p className="text-xs text-indigo/50">{t.location}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Rewards teaser */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="rounded-3xl bg-gradient-to-br from-gold/15 via-background to-konek-green/10 border border-gold/20 px-8 py-12 md:px-14 grid md:grid-cols-[1fr_auto] gap-10 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold mb-3">
              Earn as you go
            </p>
            <h2 className="font-heading text-3xl font-bold text-indigo mb-4">
              Get rewarded every time you top up
            </h2>
            <p className="text-indigo/70 mb-7 max-w-xl">
              Earn Konek Coins on every transaction, redeemable for discounts on your next top up
              or eSIM. Invite a friend and you both get credit when they make their first purchase.
            </p>
            <Link
              href="/signup"
              className="inline-block rounded-xl bg-gold text-white font-semibold px-7 py-3.5 hover:bg-gold/90 transition-colors"
            >
              Start earning coins
            </Link>
          </div>
          <Image
            src="/brand/rewards_coin.png"
            alt="A gold Konek coin"
            width={220}
            height={220}
            className="mx-auto drop-shadow-xl"
          />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 pb-20">
        <SectionLabel>Questions people ask</SectionLabel>
        <h2 className="font-heading text-3xl font-bold text-indigo text-center mb-10">
          Before you ask, gladly
        </h2>
        <div className="flex flex-col gap-3">
          {FAQS.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-2xl bg-white border border-indigo/10 px-6 py-4 shadow-sm open:shadow-md transition-shadow"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none font-semibold text-indigo">
                {faq.q}?
                <span className="ml-4 text-konek-green transition-transform group-open:rotate-45 text-xl leading-none">
                  +
                </span>
              </summary>
              <p className="text-sm text-indigo/70 leading-relaxed pt-3">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Download CTA */}
      <section id="download" className="max-w-6xl mx-auto px-6 pb-20">
        <div className="rounded-3xl bg-indigo px-8 py-14 text-center relative overflow-hidden">
          <div
            aria-hidden
            className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-konek-green/20 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-gold/20 blur-3xl"
          />
          <h2 className="relative font-heading text-3xl sm:text-4xl font-bold text-white mb-3">
            Konek is home, wherever you are
          </h2>
          <p className="relative text-white/70 mb-8">
            No download needed — create your account and start in minutes, right in your browser.
          </p>
          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <Link
              href="/signup"
              className="rounded-xl bg-white text-indigo text-center font-semibold px-8 py-3.5 hover:bg-white/90 transition-colors"
            >
              Create your account
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-white/25 text-white text-center font-semibold px-8 py-3.5 hover:bg-white/10 transition-colors"
            >
              Log in
            </Link>
          </div>
          <div className="relative flex items-center justify-center gap-4 opacity-60">
            <Image
              src="/brand/badge_appstore.png"
              alt="App Store — coming soon"
              width={168}
              height={56}
              className="h-11 w-auto rounded-lg grayscale"
            />
            <Image
              src="/brand/badge_googleplay.png"
              alt="Google Play — coming soon"
              width={168}
              height={56}
              className="h-11 w-auto rounded-lg grayscale"
            />
          </div>
          <p className="relative text-xs text-white/50 mt-3">Native apps coming soon</p>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="bg-indigo text-white">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 mb-10">
            <div>
              <p className="font-heading text-2xl font-bold mb-2">Konek</p>
              <p className="text-sm text-white/60">One wallet for home and abroad</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40 mb-4">
                Company
              </p>
              <ul className="flex flex-col gap-2.5 text-sm text-white/70">
                <li><a href="#about" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="mailto:support@konek.app" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40 mb-4">
                Products
              </p>
              <ul className="flex flex-col gap-2.5 text-sm text-white/70">
                <li><a href="#products" className="hover:text-white">Local top up</a></li>
                <li><a href="#products" className="hover:text-white">International top up</a></li>
                <li><a href="#products" className="hover:text-white">eSIM</a></li>
                <li><a href="#products" className="hover:text-white">Dollar account</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40 mb-4">
                Legal
              </p>
              <ul className="flex flex-col gap-2.5 text-sm text-white/70">
                <li><Link href="/terms" className="hover:text-white">Terms of use</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-white/50">
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
