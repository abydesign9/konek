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
import {
  IconAirtime,
  IconData,
  IconElectricity,
  IconEsim,
  IconWallet,
  IconGift,
  IconBell,
  IconChevronRight,
  SERVICE_COLORS,
} from "@/components/icons";

// Home is structured, not one long scroll: greeting+wallet, promo
// carousel (real CMS data via in_app_messages — was built and waiting,
// just never wired to a screen), 4 quick actions (the rest of the
// catalog moved to /connect per the design brief), recent transactions,
// family/beneficiary hub, rewards, and a business section that only
// renders for accounts that have one.
const QUICK_ACTIONS = [
  { key: "airtime", label: "Airtime", Icon: IconAirtime, href: "/buy/airtime" },
  { key: "data", label: "Data", Icon: IconData, href: "/buy/data" },
  { key: "electricity", label: "Bills", Icon: IconElectricity, href: "/buy/electricity" },
  { key: "esim", label: "eSIM", Icon: IconEsim, href: "/buy/esim" },
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

  const { rows } = await query<{ phone: string; full_name: string | null; kyc_tier: number }>(
    `SELECT phone, full_name, kyc_tier FROM users WHERE id = $1`,
    [userId]
  );
  const phone = rows[0]?.phone;
  const kycTier = rows[0]?.kyc_tier ?? 0;
  const firstName = rows[0]?.full_name?.split(" ")[0] || phone?.slice(-4) || "there";

  const walletAccountId = await getUserWalletAccount(userId, "NGN");
  const balanceMinor = await getBalance(walletAccountId);
  const streak = await getStreak(userId);

  const { rows: coinRows } = await query<{ coins: number }>(
    `SELECT coins FROM user_coin_balances WHERE user_id = $1`,
    [userId]
  );
  const coins = coinRows[0] ? Number(coinRows[0].coins) : 0;

  const { rows: bizRows } = await query<{ id: string; legal_name: string }>(
    `SELECT id, legal_name FROM business_accounts WHERE owner_user_id = $1`,
    [userId]
  );
  const business = bizRows[0] ?? null;

  const carousel = await listActiveInAppMessages();

  const { rows: recent } = await query<RecentPurchase>(
    `SELECT DISTINCT ON (recipient->>'phone', type) type, amount_minor, recipient
     FROM transactions
     WHERE user_id = $1
       AND type IN ('airtime', 'data', 'cable', 'electricity', 'exam_pin', 'betting', 'intl_topup')
       AND status = 'delivered'
     ORDER BY recipient->>'phone', type, created_at DESC
     LIMIT 4`,
    [userId]
  );

  const { rows: beneficiaries } = await query<Beneficiary>(
    `SELECT id, label, service_type, details FROM beneficiaries
     WHERE user_id = $1 ORDER BY pinned DESC, created_at DESC LIMIT 6`,
    [userId]
  );

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

      {/* ---------- Section 3: Quick actions ---------- */}
      <section className="mt-7 px-5">
        <div className="grid grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ key, label, Icon, href }) => {
            const c = SERVICE_COLORS[key] ?? SERVICE_COLORS.more;
            return (
              <Link key={key} href={href} className="konek-tile flex flex-col items-center gap-2">
                <div className="konek-card-shadow flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: c.bg }}>
                  <Icon className="h-7 w-7" style={{ color: c.fg }} />
                </div>
                <span className="text-center text-xs font-semibold leading-tight text-indigo">{label}</span>
              </Link>
            );
          })}
        </div>
        <Link href="/connect" className="konek-tile mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-indigo/60">
          See everything on Connect <IconChevronRight className="h-3.5 w-3.5" />
        </Link>
      </section>

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

      {/* ---------- Section 6: Rewards ---------- */}
      <section className="mt-7 px-5">
        <Link
          href="/rewards"
          className="konek-card-shadow konek-tile block rounded-2xl bg-gradient-to-r from-gold to-[#F5C15C] px-5 py-4 text-indigo"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-heading text-sm font-bold">{coins.toLocaleString()} coins</p>
              <p className="mt-0.5 text-xs text-indigo/70">
                {streak > 0 ? `${streak}-day streak · earn more by transacting daily` : "Start a streak — earn coins every day you transact"}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-white/50 px-3 py-1.5 text-xs font-semibold">View →</span>
          </div>
        </Link>
      </section>

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
    </main>
  );
}
