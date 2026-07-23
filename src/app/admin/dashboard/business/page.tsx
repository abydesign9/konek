import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { businessMetrics } from "@/lib/admin/metrics";
import { DashboardTabs, Section, StatCard, TableCard, naira } from "../ui";

export const dynamic = "force-dynamic";

// Business (B2B) dashboard — onboarding pipeline and bulk volume.
export default async function BusinessDashboardPage() {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");

  const m = await businessMetrics();
  const verified = m.byStatus["verified"] ?? 0;
  const pending = m.byStatus["pending"] ?? 0;
  const rejected = m.byStatus["rejected"] ?? 0;

  return (
    <AdminShell adminEmail={session.email}>
      <div className="px-6 py-6">
        <h1 className="mb-1 font-heading text-2xl font-bold text-indigo">Business (B2B)</h1>
        <p className="mb-5 text-sm text-indigo/55">
          Onboarding pipeline and bulk distribution volume. Businesses stay locked until KYB approval.
        </p>
        <DashboardTabs active="business" />

        <Section title="Pipeline">
          <StatCard label="Verified businesses" value={verified.toLocaleString()} tone="good" />
          <StatCard label="Awaiting approval" value={pending.toLocaleString()} tone={pending > 0 ? "warn" : "default"} href="/admin" sub={pending > 0 ? "approve in the console →" : undefined} />
          <StatCard label="Rejected" value={rejected.toLocaleString()} />
          <StatCard label="New this month" value={m.newMtd.toLocaleString()} />
        </Section>

        <Section title="Volume (month to date)">
          <StatCard label="Bulk distribution volume" value={naira(m.bulkVolumeMtdMinor)} tone="good" />
          <StatCard label="Bulk batches" value={m.bulkBatchesMtd.toLocaleString()} />
          <StatCard label="Employees served" value={m.employeesServed.toLocaleString()} sub="across all businesses" />
        </Section>

        <Section title="Top businesses (MTD)">
          <TableCard
            title="By bulk distribution volume"
            rows={m.topBusinesses.map((b, i) => ({
              label: `${i + 1}. ${b.legalName}`,
              value: naira(b.volumeMinor),
            }))}
          />
        </Section>
      </div>
    </AdminShell>
  );
}
