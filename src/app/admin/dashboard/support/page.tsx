import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { getSupportStats } from "@/lib/support/supportService";
import { DashboardTabs, Section, StatCard, TableCard } from "../ui";

export const dynamic = "force-dynamic";

// Customer support dashboard — queue health and SLA.
export default async function SupportDashboardPage() {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");

  const s = await getSupportStats();

  return (
    <AdminShell adminEmail={session.email}>
      <div className="px-6 py-6">
        <h1 className="mb-1 font-heading text-2xl font-bold text-indigo">Customer support</h1>
        <p className="mb-5 text-sm text-indigo/55">Queue health, SLA and resolution.</p>
        <DashboardTabs active="support" />

        <Section title="Queue">
          <StatCard label="Open" value={s.open.toLocaleString()} tone={s.open > 0 ? "warn" : "default"} href="/admin/support" />
          <StatCard label="Assigned" value={s.assigned.toLocaleString()} href="/admin/support" />
          <StatCard label="Waiting on customer" value={s.waitingOnCustomer.toLocaleString()} href="/admin/support" />
          <StatCard label="SLA breached" value={s.slaBreached.toLocaleString()} tone={s.slaBreached > 0 ? "bad" : "good"} href="/admin/support" />
          <StatCard label="Resolved" value={s.resolved.toLocaleString()} tone="good" />
          <StatCard label="Closed" value={s.closed.toLocaleString()} />
          <StatCard label="Total tickets" value={s.total.toLocaleString()} />
        </Section>

        <Section title="By priority">
          <TableCard
            title="Open tickets by priority"
            href="/admin/support"
            rows={Object.entries(s.byPriority).map(([priority, count]) => ({
              label: priority,
              value: count.toLocaleString(),
            }))}
          />
        </Section>
      </div>
    </AdminShell>
  );
}
