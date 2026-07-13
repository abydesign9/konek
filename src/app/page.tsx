import Link from "next/link";
import {
  IconAirtime,
  IconData,
  IconCable,
  IconElectricity,
  IconExam,
  IconBetting,
  IconGlobe,
  IconEsim,
  IconShield,
  IconWallet,
} from "@/components/icons";

const SERVICES = [
  { label: "Airtime", Icon: IconAirtime },
  { label: "Data", Icon: IconData },
  { label: "Cable", Icon: IconCable },
  { label: "Electricity", Icon: IconElectricity },
  { label: "Exam Pin", Icon: IconExam },
  { label: "Betting", Icon: IconBetting },
  { label: "Intl Top-up", Icon: IconGlobe },
  { label: "eSIM", Icon: IconEsim },
];

const REASONS = [
  {
    Icon: IconGlobe,
    title: "Top up from anywhere",
    body: "Living abroad? Fund airtime, data and bills for family back home in a couple of taps.",
  },
  {
    Icon: IconShield,
    title: "Every naira accounted for",
    body: "Built on a double-entry ledger — every transaction is tracked, balanced, and auditable.",
  },
  {
    Icon: IconWallet,
    title: "NGN and USD wallets",
    body: "Hold and spend in both currencies. No P2P transfers, no surprises — just utility payments.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <span className="font-heading text-xl font-bold text-indigo">Konek</span>
        <Link
          href="/login"
          className="text-sm font-semibold text-indigo hover:text-konek-green transition-colors"
        >
          Log in
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-8 pb-16 max-w-5xl mx-auto">
        <div
          aria-hidden
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-konek-green/10 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute top-40 -left-24 w-72 h-72 rounded-full bg-gold/10 blur-3xl"
        />

        <div className="relative grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block rounded-full bg-indigo/10 text-indigo text-xs font-semibold px-3 py-1 mb-5">
              Made for the Nigerian diaspora
            </span>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold text-indigo leading-tight mb-5">
              Keep everyone{" "}
              <span className="text-konek-green">konek</span>ted,
              wherever you are.
            </h1>
            <p className="text-indigo/70 text-base sm:text-lg mb-8 max-w-md">
              Airtime, data, cable, electricity and eSIMs — for you and the
              people back home. One app, one wallet, zero drama.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-indigo text-white text-center font-semibold px-6 py-3.5 hover:bg-indigo/90 transition-colors"
              >
                Get started — it&apos;s free
              </Link>
              <Link
                href="#services"
                className="rounded-xl border border-indigo/20 text-indigo text-center font-semibold px-6 py-3.5 hover:bg-indigo/5 transition-colors"
              >
                See what you can do
              </Link>
            </div>
          </div>

          {/* Phone mockup */}
          <div className="relative mx-auto">
            <div className="w-64 sm:w-72 rounded-[2.5rem] border-8 border-indigo bg-white shadow-2xl p-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[11px] text-indigo/50">Wallet balance</p>
                  <p className="font-heading text-xl font-bold text-indigo">₦48,250.00</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-konek-green/20 flex items-center justify-center">
                  <IconWallet className="w-4 h-4 text-konek-green" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {SERVICES.map(({ label, Icon }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5">
                    <div className="w-11 h-11 rounded-xl bg-indigo/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-indigo" />
                    </div>
                    <span className="text-[9px] text-center text-indigo/70 font-medium leading-tight">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 rounded-2xl bg-white shadow-lg px-4 py-3 text-xs border border-indigo/10 hidden sm:block">
              <p className="text-indigo/50">Sent to Mum</p>
              <p className="font-semibold text-konek-green">Data delivered ✓</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services grid */}
      <section id="services" className="px-6 py-16 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-indigo text-center mb-10">
            Everything, in one app
          </h2>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-6">
            {SERVICES.map(({ label, Icon }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-2xl bg-indigo/10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-indigo" />
                </div>
                <span className="text-xs text-center text-indigo font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Konek */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <div className="grid sm:grid-cols-3 gap-8">
          {REASONS.map(({ Icon, title, body }) => (
            <div key={title} className="flex flex-col gap-3">
              <div className="w-11 h-11 rounded-xl bg-gold/15 flex items-center justify-center">
                <Icon className="w-5 h-5 text-gold" />
              </div>
              <h3 className="font-heading font-semibold text-indigo">{title}</h3>
              <p className="text-sm text-indigo/70">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto rounded-3xl bg-indigo px-8 py-12 text-center">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white mb-3">
            Ready to konek?
          </h2>
          <p className="text-white/70 mb-7 max-w-md mx-auto">
            Sign up with your phone number — no card required to get started.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-xl bg-konek-green text-white font-semibold px-8 py-3.5 hover:bg-konek-green/90 transition-colors"
          >
            Create your account
          </Link>
        </div>
      </section>

      <footer className="px-6 py-8 text-center text-xs text-indigo/40">
        © {new Date().getFullYear()} Konek. Made for the diaspora, built for home.
      </footer>
    </main>
  );
}
