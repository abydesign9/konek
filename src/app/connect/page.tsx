import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { BottomNav } from "@/components/BottomNav";
import {
  IconAirtime,
  IconData,
  IconCable,
  IconElectricity,
  IconExam,
  IconBetting,
  IconGift,
  IconGlobe,
  IconEsim,
  IconWallet,
  IconChevronRight,
  SERVICE_COLORS,
} from "@/components/icons";

// Everything that used to live directly on Home's service grid moves here
// (spec: "Move Airtime/Data/eSIM/Bills off Home into their own hub"),
// grouped the way the design brief asked for: Connectivity / Finance /
// Business. Business only renders for accounts that actually have one —
// no dead section for 99% of users.
const CONNECTIVITY = [
  { key: "airtime", label: "Airtime", sub: "Top up any network", Icon: IconAirtime, href: "/buy/airtime" },
  { key: "data", label: "Data", sub: "Bundles for every carrier", Icon: IconData, href: "/buy/data" },
  { key: "esim", label: "eSIM", sub: "Travel data, activated in seconds", Icon: IconEsim, href: "/buy/esim" },
  { key: "intl", label: "International Top-Up", sub: "Send credit abroad", Icon: IconGlobe, href: "/buy/intl-topup" },
  { key: "cable", label: "Cable TV", sub: "DStv, GOtv, StarTimes", Icon: IconCable, href: "/buy/cable" },
  { key: "electricity", label: "Electricity", sub: "Prepaid & postpaid tokens", Icon: IconElectricity, href: "/buy/electricity" },
  { key: "exam", label: "Exam Pins", sub: "WAEC, NECO, JAMB", Icon: IconExam, href: "/buy/exam-pin" },
  { key: "betting", label: "Betting", sub: "Fund a betting wallet", Icon: IconBetting, href: "/buy/betting" },
  { key: "gift", label: "Gift Cards", sub: "Amazon, Steam, iTunes & more", Icon: IconGift, href: "/buy/gift-card" },
];

const FINANCE = [
  { key: "dollar", label: "USD Account", sub: "Receive and hold dollars", Icon: IconGlobe, href: "/wallet/dollar-account" },
  { key: "cards", label: "Cards", sub: "Virtual card for online spend", Icon: IconWallet, href: "/cards" },
  { key: "wallet", label: "Wallet", sub: "Fund, balance & history", Icon: IconWallet, href: "/wallet" },
];

function Row({ label, sub, Icon, href, tint }: { label: string; sub: string; Icon: typeof IconAirtime; href: string; tint: { bg: string; fg: string } }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 konek-card-shadow konek-tile">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: tint.bg }}>
        <Icon className="h-5 w-5" style={{ color: tint.fg }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-indigo">{label}</span>
        <span className="block truncate text-xs text-indigo/55">{sub}</span>
      </span>
      <IconChevronRight className="h-4 w-4 shrink-0 text-indigo/30" />
    </Link>
  );
}

export default async function ConnectPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const { rows: bizRows } = await query<{ id: string }>(
    `SELECT id FROM business_accounts WHERE owner_user_id = $1`,
    [userId]
  );
  const hasBusiness = bizRows.length > 0;

  return (
    <main className="min-h-screen bg-background pb-28">
      <header className="px-5 pb-3 pt-6">
        <h1 className="font-heading text-2xl font-bold text-indigo">Connect</h1>
        <p className="mt-0.5 text-sm text-indigo/55">Everything you can buy or manage on Konek, in one place.</p>
      </header>

      <section className="mt-2 px-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo/40">Connectivity</p>
        <div className="flex flex-col gap-2.5">
          {CONNECTIVITY.map((item) => (
            <Row key={item.key} label={item.label} sub={item.sub} Icon={item.Icon} href={item.href} tint={SERVICE_COLORS[item.key] ?? SERVICE_COLORS.more} />
          ))}
        </div>
      </section>

      <section className="mt-7 px-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo/40">Finance</p>
        <div className="flex flex-col gap-2.5">
          {FINANCE.map((item) => (
            <Row key={item.key} label={item.label} sub={item.sub} Icon={item.Icon} href={item.href} tint={SERVICE_COLORS.wallet} />
          ))}
        </div>
      </section>

      {hasBusiness && (
        <section className="mt-7 px-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo/40">Business</p>
          <div className="flex flex-col gap-2.5">
            <Row
              label="Business hub"
              sub="Bulk distribution, team, and API access"
              Icon={IconGlobe}
              href="/business"
              tint={SERVICE_COLORS.intl}
            />
          </div>
        </section>
      )}

      <BottomNav />
    </main>
  );
}
