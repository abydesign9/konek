import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { getUserWalletAccount } from "@/lib/ledger/accounts";
import { getBalance } from "@/lib/ledger/balance";
import { BottomNav } from "@/components/BottomNav";
import { IconWallet, IconGlobe, IconChevronRight } from "@/components/icons";

interface RecentTxn {
  id: string;
  type: string;
  status: string;
  amount_minor: string;
  currency: string;
  created_at: string;
}

// The Wallet tab didn't have its own page before — /wallet only had
// subroutes (fund, history, dollar-account, receipt) that nothing linked
// to as a hub. This is that hub: NGN balance, a USD balance if the
// account has one, fund CTA, and the 5 most recent wallet-relevant
// transactions with a link into the full History tab.
export default async function WalletPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const { rows: userRows } = await query<{ kyc_tier: number }>(`SELECT kyc_tier FROM users WHERE id = $1`, [userId]);
  const kycTier = userRows[0]?.kyc_tier ?? 0;

  const ngnAccountId = await getUserWalletAccount(userId, "NGN");
  const ngnBalanceMinor = await getBalance(ngnAccountId);

  const { rows: usdAccountRows } = await query<{ id: string }>(
    `SELECT la.id FROM ledger_accounts la WHERE la.owner_type = 'user' AND la.owner_id = $1 AND la.currency = 'USD' AND la.kind = 'wallet'`,
    [userId]
  );
  const usdBalanceMinor = usdAccountRows[0] ? await getBalance(usdAccountRows[0].id) : null;

  const { rows: recent } = await query<RecentTxn>(
    `SELECT id, type, status, amount_minor, currency, created_at FROM transactions
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
    [userId]
  );

  return (
    <main className="min-h-screen bg-background pb-28">
      <header className="px-5 pb-3 pt-6">
        <h1 className="font-heading text-2xl font-bold text-indigo">Wallet</h1>
      </header>

      <section className="px-5">
        <Link
          href={kycTier < 1 ? "/kyc" : "/wallet/fund"}
          className="konek-hero konek-card-shadow konek-tile block rounded-3xl px-6 py-6 text-white"
        >
          <p className="mb-1 text-xs uppercase tracking-wide text-white/60">Naira Wallet</p>
          <p className="font-heading text-[2rem] font-bold leading-none">₦{(ngnBalanceMinor / 100).toLocaleString()}</p>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold">
            {kycTier < 1 ? "Verify your account to fund →" : "Fund wallet →"}
          </span>
        </Link>
      </section>

      {kycTier >= 1 && (
        <section className="mt-4 px-5">
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/wallet/fund"
              className="rounded-2xl bg-indigo px-4 py-3 text-center text-sm font-semibold text-white konek-card-shadow konek-tile"
            >
              Add money
            </Link>
            <Link
              href="/wallet/withdraw"
              className="rounded-2xl border border-indigo/15 bg-white px-4 py-3 text-center text-sm font-semibold text-indigo konek-card-shadow konek-tile"
            >
              Withdraw
            </Link>
          </div>
        </section>
      )}

      <section className="mt-4 px-5">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/wallet/dollar-account" className="rounded-2xl bg-white konek-card-shadow px-4 py-3.5 konek-tile">
            <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo/10">
              <IconGlobe className="h-4.5 w-4.5 text-indigo" />
            </span>
            <p className="text-sm font-semibold text-indigo">USD account</p>
            <p className="text-xs text-indigo/55">
              {usdBalanceMinor !== null ? `$${(usdBalanceMinor / 100).toLocaleString()}` : "Set up →"}
            </p>
          </Link>
          <Link href="/cards" className="rounded-2xl bg-white konek-card-shadow px-4 py-3.5 konek-tile">
            <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-konek-green/10">
              <IconWallet className="h-4.5 w-4.5 text-konek-green" />
            </span>
            <p className="text-sm font-semibold text-indigo">Virtual card</p>
            <p className="text-xs text-indigo/55">Spend online →</p>
          </Link>
        </div>
      </section>

      <section className="mt-7 px-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-indigo">Recent activity</p>
          <Link href="/wallet/history" className="text-xs font-semibold text-indigo/60">
            See all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-2xl bg-white konek-card-shadow px-4 py-6 text-center text-sm text-indigo/50">
            No transactions yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((t) => (
              <Link
                key={t.id}
                href={`/wallet/receipt/${t.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white konek-card-shadow px-4 py-3 konek-tile"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold capitalize text-indigo">{t.type.replace(/_/g, " ")}</p>
                  <p className="text-xs text-indigo/55">{new Date(t.created_at).toLocaleDateString()} · {t.status}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="text-sm font-semibold text-indigo">
                    {t.currency === "USD" ? "$" : "₦"}
                    {(Number(t.amount_minor) / 100).toLocaleString()}
                  </p>
                  <IconChevronRight className="h-4 w-4 text-indigo/30" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <BottomNav />
    </main>
  );
}
