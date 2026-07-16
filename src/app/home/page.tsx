import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { getUserWalletAccount } from "@/lib/ledger/accounts";
import { getBalance } from "@/lib/ledger/balance";
import { getStreak } from "@/lib/rewards/getStreak";
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
  IconMore,
  IconBell,
  SERVICE_COLORS,
  NETWORK_COLORS,
} from "@/components/icons";

const SERVICES = [
  { key: "airtime", label: "Airtime", Icon: IconAirtime, href: "/buy/airtime" },
  { key: "data", label: "Data", Icon: IconData, href: "/buy/data" },
  { key: "intl", label: "Intl Top-Up", Icon: IconGlobe, href: "/buy/intl-topup" },
  { key: "esim", label: "eSIM", Icon: IconEsim, href: "/buy/esim" },
  { key: "electricity", label: "Light", Icon: IconElectricity, href: "/buy/electricity" },
  { key: "cable", label: "TV", Icon: IconCable, href: "/buy/cable" },
  { key: "exam", label: "Exam Pin", Icon: IconExam, href: "/buy/exam-pin" },
  { key: "betting", label: "Betting", Icon: IconBetting, href: "/buy/betting" },
  { key: "gift", label: "Gift Card", Icon: IconGift, href: "/buy/gift-card" },
  { key: "more", label: "More", Icon: IconMore, href: "/profile" },
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
      {/* ---------- Header ---------- */}
      <header className="px-5 pt-6 pb-3 flex items-center justify-between">
        <div>
          <p className="text-sm text-indigo/55 font-body">{greeting()},</p>
          <h1 className="font-heading text-2xl font-bold text-indigo capitalize">
            {firstName} 👋
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/wallet/history"
            className="rounded-full bg-indigo/10 text-indigo text-xs font-semibold px-3 py-2 whitespace-nowrap"
          >
            History
          </Link>
          <Link
            href="/notifications"
            className="w-11 h-11 rounded-full bg-white konek-card-shadow flex items-center justify-center konek-tile"
            aria-label="Notifications"
          >
            <IconBell className="w-5 h-5 text-indigo" />
          </Link>
          <Link
            href="/rewards"
            className="w-11 h-11 rounded-full bg-gold/15 konek-card-shadow flex items-center justify-center konek-tile"
            aria-label="Rewards"
          >
            <IconGift className="w-5 h-5 text-gold" />
          </Link>
        </div>
      </header>

      {kycTier < 1 && (
        <section className="px-5 mb-1">
          <Link
            href="/kyc"
            className="block rounded-2xl bg-gold/15 border border-gold/40 px-5 py-4 konek-tile"
          >
            <p className="font-heading font-semibold text-indigo mb-0.5">Verify your account to get started</p>
            <p className="text-sm text-indigo/70">
              Confirm your BVN or NIN to fund your wallet and start buying. Takes under a minute →
            </p>
          </Link>
        </section>
      )}

      {/* ---------- Hero balance card ---------- */}
      <section className="px-5 mt-3">
        <Link
          href={kycTier < 1 ? "/kyc" : "/wallet/fund"}
          className="konek-hero konek-card-shadow block rounded-3xl px-6 py-6 text-white konek-tile"
        >
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-xs text-white/60 font-body mb-1 tracking-wide uppercase">
                Wallet Balance
              </p>
              <p className="font-heading text-[2.1rem] leading-none font-bold">
                ₦{(balanceMinor / 100).toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-konek-green/25 flex items-center justify-center shrink-0">
              <IconWallet className="w-6 h-6 text-konek-green" />
            </div>
          </div>
          <div className="relative z-10 mt-5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/12 rounded-full px-3 py-1.5">
              {kycTier < 1 ? "Verify your account to fund →" : "Tap to fund →"}
            </span>
            {streak > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-gold/25 text-gold-100 rounded-full px-3 py-1.5">
                🔥 {streak}-day streak
              </span>
            )}
          </div>
        </Link>
      </section>

      {/* ---------- Dollar account / card / business hub ---------- */}
      <section className="mt-4 px-5">
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/wallet/dollar-account"
            className="rounded-2xl bg-white konek-card-shadow px-4 py-3 konek-tile"
          >
            <p className="text-sm font-semibold text-indigo">Dollar account</p>
            <p className="text-xs text-indigo/60">Receive USD →</p>
          </Link>
          <Link
            href="/cards"
            className="rounded-2xl bg-white konek-card-shadow px-4 py-3 konek-tile"
          >
            <p className="text-sm font-semibold text-indigo">Virtual card</p>
            <p className="text-xs text-indigo/60">Spend online →</p>
          </Link>
          <Link
            href="/business"
            className="rounded-2xl bg-white konek-card-shadow px-4 py-3 konek-tile col-span-2"
          >
            <p className="text-sm font-semibold text-indigo">Business hub</p>
            <p className="text-xs text-indigo/60">Bulk airtime & data for your team →</p>
          </Link>
        </div>
      </section>

      {/* ---------- Beneficiary avatar row ---------- */}
      {beneficiaries.length > 0 && (
        <section className="mt-6 px-5">
          <div className="flex gap-4 overflow-x-auto konek-scrollbar-none pb-1">
            {beneficiaries.map((b) => {
              const net = NETWORK_COLORS[b.details.network?.toLowerCase() || ""] ?? {
                bg: "#E6F0FF",
                fg: "#22315C",
                label: b.details.network ?? "",
              };
              return (
                <Link
                  key={b.id}
                  href={beneficiaryHref(b)}
                  className="flex flex-col items-center gap-1.5 shrink-0 konek-tile"
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center font-heading font-bold text-lg konek-card-shadow"
                    style={{ backgroundColor: net.bg, color: net.fg }}
                  >
                    {b.label.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-indigo font-medium max-w-[64px] truncate text-center">
                    {b.label}
                  </span>
                </Link>
              );
            })}
            <Link
              href="/beneficiaries/new"
              className="flex flex-col items-center gap-1.5 shrink-0 konek-tile"
            >
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-indigo/25 flex items-center justify-center text-indigo/50 text-2xl font-light">
                +
              </div>
              <span className="text-xs text-indigo/50 font-medium">Add</span>
            </Link>
          </div>
        </section>
      )}

      {/* ---------- Buy again ---------- */}
      {recent.length > 0 && (
        <section className="mt-6 px-5">
          <p className="text-sm font-semibold text-indigo mb-3">Buy again</p>
          <div className="flex gap-3 overflow-x-auto konek-scrollbar-none pb-1">
            {recent.map((txn, i) => {
              const net = NETWORK_COLORS[txn.recipient.network?.toLowerCase() || ""];
              return (
                <Link
                  key={i}
                  href={repeatHref(txn)}
                  className="whitespace-nowrap rounded-2xl bg-white konek-card-shadow px-4 py-3 konek-tile flex items-center gap-3"
                >
                  {net && (
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: net.bg, color: net.fg }}
                    >
                      {net.label.slice(0, 2)}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-indigo capitalize">
                      {txn.type.replace("_", " ")}
                    </p>
                    <p className="text-xs text-indigo/55">
                      {txn.recipient.phone} · ₦{(Number(txn.amount_minor) / 100).toLocaleString()}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------- Service grid — the main event ---------- */}
      <section className="mt-7 px-5">
        <div className="grid grid-cols-3 gap-4">
          {SERVICES.map(({ key, label, Icon, href }) => {
            const c = SERVICE_COLORS[key] ?? SERVICE_COLORS.more;
            const content = (
              <>
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center konek-card-shadow"
                  style={{ backgroundColor: c.bg }}
                >
                  <Icon className="w-8 h-8" style={{ color: c.fg }} />
                </div>
                <span className="text-xs text-center text-indigo font-semibold leading-tight">
                  {label}
                </span>
              </>
            );
            return href ? (
              <Link
                key={key}
                href={href}
                className="flex flex-col items-center gap-2 konek-tile"
              >
                {content}
              </Link>
            ) : (
              <div key={key} className="flex flex-col items-center gap-2 opacity-40">
                {content}
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- Promo / referral banner ---------- */}
      <section className="mt-7 px-5">
        <Link
          href="/rewards"
          className="konek-card-shadow konek-tile block rounded-2xl px-5 py-4 bg-gradient-to-r from-gold to-[#F5C15C] text-indigo"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-heading font-bold text-sm">Earn ₦500 per friend 🎁</p>
              <p className="text-xs text-indigo/70 mt-0.5">
                Refer a friend who transacts and you both get credit.
              </p>
            </div>
            <span className="text-xs font-semibold bg-white/50 rounded-full px-3 py-1.5 shrink-0">
              Share →
            </span>
          </div>
        </Link>
      </section>

      {/* ---------- Bottom nav ---------- */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-indigo/10 px-6 py-3 flex items-center justify-between konek-card-shadow">
        <Link href="/home" className="flex flex-col items-center gap-0.5 text-indigo">
          <IconWallet className="w-5 h-5" />
          <span className="text-[11px] font-semibold">Home</span>
        </Link>
        <Link href="/wallet" className="flex flex-col items-center gap-0.5 text-indigo/45">
          <IconAirtime className="w-5 h-5" />
          <span className="text-[11px] font-medium">Wallet</span>
        </Link>
        <Link href="/rewards" className="flex flex-col items-center gap-0.5 text-indigo/45">
          <IconGift className="w-5 h-5" />
          <span className="text-[11px] font-medium">Rewards</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-0.5 text-indigo/45">
          <IconMore className="w-5 h-5" />
          <span className="text-[11px] font-medium">Me</span>
        </Link>
      </nav>
    </main>
  );
}
