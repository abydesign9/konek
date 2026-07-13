import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { getUserWalletAccount } from "@/lib/ledger/accounts";
import { getBalance } from "@/lib/ledger/balance";
import {
  IconAirtime,
  IconData,
  IconCable,
  IconElectricity,
  IconExam,
  IconBetting,
  IconGlobe,
  IconEsim,
  IconWallet,
} from "@/components/icons";

const SERVICES = [
  { label: "Airtime", Icon: IconAirtime, href: "/buy/airtime" },
  { label: "Data", Icon: IconData, href: "/buy/data" },
  { label: "Cable", Icon: IconCable, href: null },
  { label: "Electricity", Icon: IconElectricity, href: null },
  { label: "Exam Pin", Icon: IconExam, href: null },
  { label: "Betting", Icon: IconBetting, href: null },
  { label: "Intl Top-up", Icon: IconGlobe, href: null },
  { label: "eSIM", Icon: IconEsim, href: null },
];

interface RecentPurchase {
  type: "airtime" | "data";
  amount_minor: string;
  recipient: { phone: string; network: string; planExternalId?: string };
}

export default async function HomeDashboard() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const { rows } = await query<{ phone: string }>(`SELECT phone FROM users WHERE id = $1`, [userId]);
  const phone = rows[0]?.phone;

  const walletAccountId = await getUserWalletAccount(userId, "NGN");
  const balanceMinor = await getBalance(walletAccountId);

  const { rows: recent } = await query<RecentPurchase>(
    `SELECT DISTINCT ON (recipient->>'phone', type) type, amount_minor, recipient
     FROM transactions
     WHERE user_id = $1 AND type IN ('airtime', 'data') AND status = 'delivered'
     ORDER BY recipient->>'phone', type, created_at DESC
     LIMIT 4`,
    [userId]
  );

  function repeatHref(txn: RecentPurchase) {
    const p = new URLSearchParams({
      network: txn.recipient.network,
      phone: txn.recipient.phone,
    });
    if (txn.type === "airtime") {
      p.set("amountMinor", txn.amount_minor);
      return `/buy/airtime?${p.toString()}`;
    }
    if (txn.recipient.planExternalId) p.set("planExternalId", txn.recipient.planExternalId);
    return `/buy/data?${p.toString()}`;
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <header className="mb-6">
        <p className="text-sm text-indigo/60">Welcome back</p>
        <h1 className="font-heading text-xl font-bold text-indigo">{phone}</h1>
      </header>

      <Link
        href="/wallet/fund"
        className="block rounded-2xl bg-indigo px-5 py-4 mb-8 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/60 mb-1">Wallet balance</p>
            <p className="font-heading text-2xl font-bold">
              ₦{(balanceMinor / 100).toLocaleString()}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-konek-green/20 flex items-center justify-center">
            <IconWallet className="w-5 h-5 text-konek-green" />
          </div>
        </div>
        <p className="text-xs text-white/70 mt-3">Tap to fund wallet →</p>
      </Link>

      {recent.length > 0 && (
        <section className="mb-8">
          <p className="text-sm text-indigo/60 mb-3">Buy again</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recent.map((txn, i) => (
              <Link
                key={i}
                href={repeatHref(txn)}
                className="whitespace-nowrap rounded-xl border border-indigo/20 bg-white px-4 py-3 hover:bg-indigo/5"
              >
                <p className="text-sm font-semibold text-indigo capitalize">
                  {txn.type} · {txn.recipient.network}
                </p>
                <p className="text-xs text-indigo/60">
                  {txn.recipient.phone} · ₦{(Number(txn.amount_minor) / 100).toLocaleString()}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-4 gap-4">
        {SERVICES.map(({ label, Icon, href }) => {
          const content = (
            <>
              <div className="w-14 h-14 rounded-2xl bg-indigo/10 flex items-center justify-center">
                <Icon className="w-6 h-6 text-indigo" />
              </div>
              <span className="text-xs text-center text-indigo font-medium">{label}</span>
            </>
          );
          return href ? (
            <Link key={label} href={href} className="flex flex-col items-center gap-2">
              {content}
            </Link>
          ) : (
            <div key={label} className="flex flex-col items-center gap-2 opacity-40">
              {content}
            </div>
          );
        })}
      </section>

      <form action="/api/auth/logout" method="post" className="mt-12">
        <button type="submit" className="text-sm text-indigo/60 underline">
          Log out
        </button>
      </form>
    </main>
  );
}
