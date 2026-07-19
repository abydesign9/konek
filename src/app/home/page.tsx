import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { getUserWalletAccount } from "@/lib/ledger/accounts";
import { getBalance } from "@/lib/ledger/balance";
import { getStreak } from "@/lib/rewards/getStreak";
import { listActiveInAppMessages } from "@/lib/notifications/inAppMessages";
import { NetworkLogo } from "@/components/NetworkLogo";
import { BottomNav } from "@/components/BottomNav";
import PromoCarousel from "@/components/PromoCarousel";
import { OnboardingTour } from "@/components/OnboardingTour";
import {
  IconAirtime,
  IconData,
  IconElectricity,
  IconEsim,
  IconGlobe,
  IconDollar,
  IconCard,
  IconWallet,
  IconGift,
  IconBell,
  IconChevronRight,
  SERVICE_COLORS,
} from "@/components/icons";

// Home is structured, not one long scroll: greeting+wallet, promo
// carousel (real CMS data via in_app_messages — was built and waiting,
// just never wired to a screen), quick actions, recent transactions,
// family/beneficiary hub, rewards, and a business section that only
// renders for accounts that have one.
//
// Quick actions lead with the connectivity/global row (what Konek is,
// per the positioning), then local VTU underneath — not the other way
// round. Icons here are deliberately smaller than the old 56px tiles so
// two rows sit comfortably without the screen feeling like a grid of
// app-store buttons.
const GLOBAL_ACTIONS = [
  { key: "esim", label: "eSIM", Icon: IconEsim, href: "/buy/esim" },
  { key: "intl", label: "Int'l Top-Up", Icon: IconGlobe, href: "/buy/intl-topup" },
  { key: "dollar", label: "USD Account", Icon: IconDollar, href: "/wallet/dollar-account" },
  { key: "card", label: "Card", Icon: IconCard, href: "/cards" },
  { key: "global-data", label: "Data Top-Up", Icon: IconData, href: "/buy/data-topup" },
];

const LOCAL_ACTIONS = [
  { key: "airtime", label: "Airtime", Icon: IconAirtime, href: "/buy/airtime" },
  { key: "data", label: "Data", Icon: IconData, href: "/buy/data" },
  { key: "electricity", label: "Bills", Icon: IconElectricity, href: "/buy/electricity" },
];

interface RecentPurchase {
  type: "airtime" | "data" | "cable" | "electricity" | "exam_pin" | "betting" | "intl_topup";
  amount_minor: string;
  recipient: {
    phone: string;
    network: string;
    planExternalId?: string;
    displayAmountMinor?: number;
  };
}

interface Beneficiary {
  id: string;
  label: string;
  service_type: string;
  details: { phone?: string; network?: string };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function HomeDashboard() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  // All of the home dashboard's data depends only on userId, so fetch it in a
  // single parallel batch instead of seven serial round-trips. The only chain is
  // wallet account -> balance, kept together in one branch.
  const [rows, balanceMinor, streak, bizRows, carousel, recent, beneficiaries] = await Promise.all([
    query<{ phone: string; full_name: string | null; kyc_tier: number }>(
      `SELECT phone, full_name, kyc_tier FROM users WHERE id = $1`,
      [userId]
    ).then((r) => r.rows),
    getUserWalletAccount(userId, "NGN").then((acc) => getBalance(acc)),
    getStreak(userId),
    query<{ id: string; legal_name: string }>(
      `SELECT id, legal_name FROM business_accounts WHERE owner_user_id = $1`,
      [userId]
    ).then((r) => r.rows),
    listActiveInAppMessages(),
    query<RecentPurchase>(
      `SELECT DISTINCT ON (recipient->>'phone', type) type, amount_minor, recipient
       FROM transactions
       WHERE user_id = $1
         AND type IN ('airtime', 'data', 'cable', 'electricity', 'exam_pin', 'betting', 'intl_topup')
         AND status = 'delivered'
       ORDER BY recipient->>'phone', type, created_at DESC
       LIMIT 4`,
      [userId]
    ).then((r) => r.rows),
    query<Beneficiary>(
      `SELECT id, label, service_type, details FROM beneficiaries
       WHERE user_id = $1 ORDER BY pinned DESC, created_at DESC LIMIT 6`,
      [userId]
    ).then((r) => r.rows),
  ]);

  const phone = rows[0]?.phone;
  const kycTier = rows[0]?.kyc_tier ?? 0;
  const firstName = rows[0]?.full_name?.split(" ")[0] || phone?.slice(-4) || "there";
  const business = bizRows[0] ?? null;

  const BUY_PATH: Record<RecentPurchase["type"], string> = {
    airtime: "/buy/airtime",
    data: "/buy/data",
    cable: "/buy/cable",
    electricity: "/buy/electricity",
    exam_pin: "/buy/exam-pin",
    betting: "/buy/betting",
    intl_topup: "/buy/intl-topup",
  };

  function repeatHref(txn: RecentPurchase) {
    const p = new URLSearchParams({ network: txn.recipient.network, phone: txn.recipient.phone });
    if (txn.type === "airtime" || txn.type === "electricity" || txn.type === "betting") {
      p.set("amountMinor", txn.amount_minor);
    } else if (txn.type === "intl_topup" && txn.recipient.displayAmountMinor) {
      p.set("amountMinor", String(txn.recipient.displayAmountMinor));
    } else if (txn.recipient.planExternalId) {
      p.set("planExternalId", txn.recipient.planExternalId);
    }
    return `${BUY_PATH[txn.type]}?${p.toString()}`;
  }

  function beneficiaryHref(b: Beneficiary) {
    const p = new URLSearchParams();
    if (b.details.network) p.set("network", b.details.network);
    if (b.details.phone) p.set("phone", b.details.phone);
    const path = b.service_type === "intl_topup" ? "/buy/intl-topup" : `/buy/${b.service_type}`;
    return `${path}?${p.toString()}`;
  }

  return (
    <main className="min-h-screen bg-background pb-28">
      {/* ---------- Section 1: Greeting + Wallet ---------- */}
      <header className="flex items-center justify-between px-5 pb-3 pt-6">
        <div>
          <p className="font-body text-sm text-indigo/55">{greeting()},</p>
          <h1 className="font-heading text-2xl font-bold capitalize text-indigo">{firstName} 👋</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/notifications"
            className="konek-tile flex h-11 w-11 items-center justify-center rounded-full bg-white konek-card-shadow"
            aria-label="Notifications"
          >
            <IconBell className="h-5 w-5 text-indigo" />
          </Link>
          <Link
            href="/rewards"
            className="konek-tile flex h-11 w-11 items-center justify-center rounded-full bg-gold/15 konek-card-shadow"
            aria-label="Rewards"
          >
            <IconGift className="h-5 w-5 text-gold" />
          </Link>
        </div>
      </header>

      {kycTier < 1 && (
        <section className="mb-1 px-5">
          <Link href="/kyc" className="konek-tile block rounded-2xl border border-gold/40 bg-gold/15 px-5 py-4">
            <p className="mb-0.5 font-heading font-semibold text-indigo">Verify your account to get started</p>
            <p className="text-sm text-indigo/70">
              Confirm your BVN or NIN to fund your wallet and start buying. Takes under a minute →
            </p>
          </Link>
        </section>
      )}

      <section className="mt-3 px-5">
        <Link
          href={kycTier < 1 ? "/kyc" : "/wallet/fund"}
          className="konek-hero konek-card-shadow konek-tile block rounded-3xl px-6 py-6 text-white"
        >
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="mb-1 font-body text-xs uppercase tracking-wide text-white/60">Wallet Balance</p>
              <p className="font-heading text-[2.1rem] font-bold leading-none">₦{(balanceMinor / 100).toLocaleString()}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-konek-green/25">
              <IconWallet className="h-6 w-6 text-konek-green" />
            </div>
          </div>
          <div className="relative z-10 mt-5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold">
              {kycTier < 1 ? "Verify your account to fund →" : "Tap to fund →"}
            </span>
            {streak > 0 && (
              <span className="text-gold-100 inline-flex items-center gap-1 rounded-full bg-gold/25 px-3 py-1.5 text-xs font-semibold">
                🔥 {streak}-day streak
              </span>
            )}
          </div>
        </Link>
      </section>

      {/* ---------- Section 2: Promo carousel (real CMS data) ---------- */}
      {carousel.length > 0 && (
        <section className="konek-scrollbar-none mt-5 flex gap-3 overflow-x-auto px-5 pb-1">
          {carousel.map((m) => {
            const card = (
              <div className="konek-card-shadow konek-tile w-64 shrink-0 rounded-2xl bg-gradient-to-br from-indigo to-[#324675] px-5 py-4 text-white">
                <p className="font-heading text-sm font-bold">{m.title}</p>
                <p className="mt-1 text-xs text-white/70">{m.message}</p>
              </div>
            );
            return m.url ? (
              <Link key={m.id} href={m.url}>
                {card}
              </Link>
            ) : (
              <div key={m.id}>{card}</div>
            );
          })}
        </section>
      )}

      {/* ---------- Section 3: Quick actions (global first, local underneath) ---------- */}
      <section className="mt-7 px-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo/45">Go global</p>
        <div className="grid grid-cols-4 gap-x-2 gap-y-2">
          {GLOBAL_ACTIONS.map(({ key, label, Icon, href }) => {
            const c = SERVICE_COLORS[key] ?? SERVICE_COLORS.more;
            return (
              <Link key={key} href={href} className="konek-tile flex flex-col items-center gap-1.5">
                <div className="konek-card-shadow flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: c.bg }}>
                  <Icon className="h-5 w-5" style={{ color: c.fg }} />
                </div>
                <span className="text-center text-[11px] font-semibold leading-tight text-indigo">{label}</span>
              </Link>
            );
          })}
        </div>

        <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-indigo/45">Bills &amp; top-ups</p>
        <div className="grid grid-cols-4 gap-x-2 gap-y-2">
          {LOCAL_ACTIONS.map(({ key, label, Icon, href }) => {
            const c = SERVICE_COLORS[key] ?? SERVICE_COLORS.more;
            return (
              <Link key={key} href={href} className="konek-tile flex flex-col items-center gap-1.5">
                <div className="konek-card-shadow flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: c.bg }}>
                  <Icon className="h-5 w-5" style={{ color: c.fg }} />
                </div>
                <span className="text-center text-[11px] font-semibold leading-tight text-indigo">{label}</span>
              </Link>
            );
          })}
          <Link href="/connect" className="konek-tile flex flex-col items-center gap-1.5">
            <div className="konek-card-shadow flex h-11 w-11 items-center justify-center rounded-xl bg-hover-tint">
              <IconChevronRight className="h-5 w-5 text-indigo/60" />
            </div>
            <span className="text-center text-[11px] font-semibold leading-tight text-indigo/60">More</span>
          </Link>
        </div>
      </section>

      {/* ---------- Section 3b: Evergreen product promos ---------- */}
      <div className="mt-6">
        <PromoCarousel />
      </div>

      {/* ---------- Section 4: Recent transactions ---------- */}
      {recent.length > 0 && (
        <section className="mt-7 px-5">
          <p className="mb-3 text-sm font-semibold text-indigo">Recent transactions</p>
          <div className="konek-scrollbar-none flex gap-3 overflow-x-auto pb-1">
            {recent.map((txn, i) => (
              <Link
                key={i}
                href={repeatHref(txn)}
                className="konek-card-shadow konek-tile flex items-center gap-3 whitespace-nowrap rounded-2xl bg-white px-4 py-3"
              >
                <NetworkLogo network={txn.recipient.network} size={32} />
                <div>
                  <p className="text-sm font-semibold capitalize text-indigo">{txn.type.replace("_", " ")}</p>
                  <p className="text-xs text-indigo/55">
                    {txn.recipient.phone} · ₦{(Number(txn.amount_minor) / 100).toLocaleString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Section 5: Family Hub ---------- */}
      {beneficiaries.length > 0 && (
        <section className="mt-7 px-5">
          <p className="mb-3 text-sm font-semibold text-indigo">Family Hub</p>
          <div className="konek-scrollbar-none flex gap-3 overflow-x-auto pb-1">
            {beneficiaries.map((b) => (
              <Link
                key={b.id}
                href={beneficiaryHref(b)}
                className="konek-card-shadow konek-tile flex shrink-0 items-center gap-3 rounded-2xl bg-white px-4 py-3"
              >
                <NetworkLogo network={b.details.network} size={40} />
                <div>
                  <p className="max-w-[96px] truncate text-sm font-semibold text-indigo">{b.label}</p>
                  <p className="text-xs text-indigo/55 capitalize">Renew {b.service_type.replace("_", " ")}</p>
                </div>
              </Link>
            ))}
            <Link
              href="/beneficiaries/new"
              className="konek-tile flex shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-indigo/25 px-5 py-3 text-indigo/50"
            >
              <span className="text-2xl font-light leading-none">+</span>
              <span className="text-xs font-medium">Add</span>
            </Link>
          </div>
        </section>
      )}


      {/* ---------- Section 7: Businesses (only if the user has one) ---------- */}
      {business && (
        <section className="mt-7 px-5">
          <p className="mb-3 text-sm font-semibold text-indigo">Business</p>
          <Link href="/business" className="konek-card-shadow konek-tile block rounded-2xl bg-white px-4 py-3.5">
            <p className="text-sm font-semibold text-indigo">{business.legal_name}</p>
            <p className="text-xs text-indigo/60">Bulk airtime & data for your team →</p>
          </Link>
        </section>
      )}

      <BottomNav />
      <OnboardingTour />
    </main>
  );
}
