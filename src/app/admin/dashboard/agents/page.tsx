import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { agentMetrics } from "@/lib/admin/metrics";
import { DashboardTabs, Section, StatCard, TableCard, naira } from "../ui";

export const dynamic = "force-dynamic";

// Agent network dashboard — onboarding, float, commissions and top sellers.
export default async function AgentsDashboardPage() {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");

  const m = await agentMetrics();
  const active = m.byStatus["active"] ?? 0;
  const pending = m.byStatus["pending"] ?? 0;
  const suspended = m.byStatus["suspended"] ?? 0;

  return (
    <AdminShell adminEmail={session.email}>
      <div className="px-6 py-6">
        <h1 className="mb-1 font-heading text-2xl font-bold text-indigo">Agents</h1>
        <p className="mb-5 text-sm text-indigo/55">
          The agent network: onboarding, float, commission liabilities and top performers.
        </p>
        <DashboardTabs active="agents" />

        <Section title="Network">
          <StatCard label="Active agents" value={active.toLocaleString()} tone="good" />
          <StatCard label="Pending applications" value={pending.toLocaleString()} tone={pending > 0 ? "warn" : "default"} href="/admin/agents" sub={pending > 0 ? "approve now →" : undefined} />
          <StatCard label="Suspended" value={suspended.toLocaleString()} tone={suspended > 0 ? "bad" : "default"} />
          <StatCard label="Total float" value={naira(m.floatTotalMinor)} sub="across all agent float accounts" />
        </Section>

        <Section title="Commissions">
          <StatCard label="Unpaid commissions" value={naira(m.unpaidCommissionsMinor)} tone={m.unpaidCommissionsMinor > 0 ? "warn" : "default"} sub="owed to agents — pay them out →" href="/admin/agents" />
          <StatCard label="Earned this month" value={naira(m.commissionsMtdMinor)} tone="good" />
        </Section>

        <Section title="Top agents (MTD)">
          <TableCard
            title="By commission earned"
            rows={m.topAgents.map((a, i) => ({
              label: `${i + 1}. ${a.email ?? a.phone ?? "agent"}`,
              value: naira(a.earnedMinor),
              sub: `${a.sales.toLocaleString()} sales`,
            }))}
          />
        </Section>
      </div>
    </AdminShell>
  );
}
