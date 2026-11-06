import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { executiveMetrics } from "@/lib/admin/metrics";
import { txnTypeLabel } from "@/lib/format";
import { DashboardTabs, Section, StatCard, TableCard, naira, pct } from "./ui";

export const dynamic = "force-dynamic";

// Executive dashboard — the first page after admin login. Answers "how is
// raviion performing today?" at a glance; every card drills down.
export default async function ExecutiveDashboardPage() {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");

  const m = await executiveMetrics();
  const gmvDelta = m.gmvYesterdayMinor
    ? (m.gmvTodayMinor - m.gmvYesterdayMinor) / m.gmvYesterdayMinor
    : null;

  return (
    <AdminShell adminEmail={session.email}>
      <div className="px-6 py-6">
        <h1 className="mb-1 font-heading text-2xl font-bold text-indigo">Executive dashboard</h1>
        <p className="mb-5 text-sm text-indigo/55">How is raviion performing today?</p>
        <DashboardTabs active="executive" />

        <Section title="Financial">
          <StatCard
            label="GMV today"
            value={naira(m.gmvTodayMinor)}
            sub={gmvDelta === null ? undefined : `${gmvDelta >= 0 ? "▲" : "▼"} ${Math.abs(gmvDelta * 100).toFixed(0)}% vs yesterday`}
            tone={gmvDelta !== null && gmvDelta < 0 ? "warn" : "good"}
            href="/admin/dashboard/gmv?range=today"
          />
          <StatCard label="GMV yesterday" value={naira(m.gmvYesterdayMinor)} href="/admin/dashboard/gmv?range=yesterday" />
          <StatCard label="GMV month-to-date" value={naira(m.gmvMtdMinor)} href="/admin/dashboard/gmv?range=mtd" />
          <StatCard
            label="Top product (MTD)"
            value={m.revenueByProduct[0] ? txnTypeLabel(m.revenueByProduct[0].product) : "—"}
            sub={m.revenueByProduct[0] ? naira(m.revenueByProduct[0].gmvMinor) : undefined}
            href="/admin/dashboard/gmv?range=mtd"
          />
          <TableCard
            title="Revenue by product (MTD GMV)"
            href="/admin/dashboard/gmv?range=mtd"
            rows={m.revenueByProduct.slice(0, 6).map((p) => ({
              label: txnTypeLabel(p.product),
              value: naira(p.gmvMinor),
              sub: `${p.txns.toLocaleString()} transactions`,
              href: `/admin/dashboard/gmv/${p.product}?range=mtd`,
            }))}
          />
        </Section>

        <Section title="Customers">
          <StatCard label="New signups today" value={m.customers.signupsToday.toLocaleString()} href="/admin/dashboard/growth" />
          <StatCard label="Active users today" value={m.customers.activeToday.toLocaleString()} href="/admin/dashboard/growth" />
          <StatCard label="Active users (30d)" value={m.customers.active30d.toLocaleString()} href="/admin/dashboard/growth" />
          <StatCard label="Returning users (30d)" value={m.customers.returning30d.toLocaleString()} href="/admin/dashboard/growth" />
          <StatCard label="New businesses (MTD)" value={m.customers.newBusinessesMtd.toLocaleString()} href="/admin/dashboard/business" />
          <StatCard label="New agents (MTD)" value={m.customers.newAgentsMtd.toLocaleString()} href="/admin/dashboard/agents" />
          <StatCard label="KYC completion" value={pct(m.customers.kycCompletionRate)} href="/admin/kyc" />
          <StatCard label="Referral conversion" value={pct(m.customers.referralConversionRate)} href="/admin/dashboard/growth" />
        </Section>

        <Section title="Transactions (today)">
          <StatCard label="Total" value={m.txns.todayTotal.toLocaleString()} href="/admin/dashboard/gmv?range=today" />
          <StatCard label="Successful" value={m.txns.todayDelivered.toLocaleString()} tone="good" />
          <StatCard
            label="Failed"
            value={m.txns.todayFailed.toLocaleString()}
            tone={m.txns.todayFailed > 0 ? "bad" : "default"}
            href="/admin/dashboard/ops"
          />
          <StatCard
            label="Pending"
            value={m.txns.todayPending.toLocaleString()}
            tone={m.txns.todayPending > 0 ? "warn" : "default"}
            href="/admin/dashboard/ops"
          />
          <StatCard label="Average value" value={naira(m.txns.avgValueTodayMinor)} />
        </Section>

        <Section title="Providers (last hour)">
          {m.providers.length === 0 ? (
            <StatCard label="Provider calls" value="—" sub="No provider traffic in the last hour" href="/admin/providers" />
          ) : (
            m.providers.map((p) => {
              const rate = p.successRatePct ?? 0;
              return (
                <StatCard
                  key={p.provider}
                  label={p.provider}
                  value={p.successRatePct === null ? "—" : `${rate.toFixed(0)}%`}
                  sub={`${p.calls} calls · p95 ${p.latencyP95Ms ?? "—"}ms${p.circuitOpen > 0 ? " · ⚡ circuit open" : ""}`}
                  tone={p.successRatePct === null ? "default" : rate >= 98 ? "good" : rate >= 90 ? "warn" : "bad"}
                  href="/admin/providers"
                />
              );
            })
          )}
        </Section>

        <Section title="Operations">
          <StatCard label="Open tickets" value={m.ops.supportOpen.toLocaleString()} href="/admin/dashboard/support" tone={m.ops.supportOpen > 0 ? "warn" : "default"} />
          <StatCard label="Fraud reviews" value={m.ops.fraudOpen.toLocaleString()} href="/admin/dashboard/ops" tone={m.ops.fraudOpen > 0 ? "bad" : "default"} />
          <StatCard label="Pending KYC" value={m.ops.kycPending.toLocaleString()} href="/admin/kyc" />
          <StatCard label="Pending businesses" value={m.ops.businessPending.toLocaleString()} href="/admin/dashboard/business" />
          <StatCard label="Stuck transactions" value={m.ops.pendingTxns.toLocaleString()} href="/admin/dashboard/ops" tone={m.ops.pendingTxns > 0 ? "warn" : "default"} />
        </Section>
      </div>
    </AdminShell>
  );
}
