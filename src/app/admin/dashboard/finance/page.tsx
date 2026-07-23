import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { financeMetrics } from "@/lib/admin/metrics";
import { DashboardTabs, Section, StatCard, TableCard, naira, usd } from "../ui";

export const dynamic = "force-dynamic";

// Finance dashboard — balances, obligations and money movement this month.
export default async function FinanceDashboardPage() {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");

  const m = await financeMetrics();

  return (
    <AdminShell adminEmail={session.email}>
      <div className="px-6 py-6">
        <h1 className="mb-1 font-heading text-2xl font-bold text-indigo">Finance</h1>
        <p className="mb-5 text-sm text-indigo/55">
          Wallet liabilities, reservations and month-to-date money movement. Balances are derived from
          the double-entry ledger.
        </p>
        <DashboardTabs active="finance" />

        <Section title="Customer wallet liabilities">
          {m.walletLiabilities.length === 0 ? (
            <StatCard label="Wallets" value="—" sub="No wallet balances yet" />
          ) : (
            m.walletLiabilities.map((w) => (
              <StatCard
                key={w.currency}
                label={`${w.currency} wallets`}
                value={w.currency === "USD" ? usd(w.totalMinor) : naira(w.totalMinor)}
                sub={`${w.wallets.toLocaleString()} accounts`}
              />
            ))
          )}
          <StatCard
            label="Held reservations"
            value={naira(m.reservationsHeldMinor)}
            sub={`${m.reservationsHeld.toLocaleString()} holds awaiting settle/release`}
            tone={m.reservationsHeld > 0 ? "warn" : "default"}
          />
        </Section>

        <Section title="Money movement (month to date)">
          <StatCard label="Wallet funding" value={naira(m.fundingMtd.totalMinor)} sub={`${m.fundingMtd.count.toLocaleString()} deposits`} tone="good" />
          <StatCard label="Withdrawals" value={naira(m.withdrawalsMtd.totalMinor)} sub={`${m.withdrawalsMtd.count.toLocaleString()} payouts`} />
          <StatCard label="Refunds" value={naira(m.refundsMtd.totalMinor)} sub={`${m.refundsMtd.count.toLocaleString()} refunds`} tone={m.refundsMtd.count > 0 ? "warn" : "default"} />
          <StatCard label="FX conversions" value={usd(m.fxConversionsMtd.usdMinor)} sub={`${m.fxConversionsMtd.count.toLocaleString()} USD→NGN conversions`} />
        </Section>

        <Section title="Tools">
          <TableCard
            title="Finance tools"
            rows={[
              { label: "Transactions ledger", value: "→", sub: "Search and refund transactions", href: "/admin" },
              { label: "FX rates", value: "→", sub: "Mid rate and spread configuration", href: "/admin/rates" },
              { label: "Catalog pricing", value: "→", sub: "Plan prices and margins", href: "/admin/rates" },
            ]}
          />
        </Section>
      </div>
    </AdminShell>
  );
}
