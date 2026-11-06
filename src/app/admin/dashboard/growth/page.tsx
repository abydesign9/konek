import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { growthMetrics } from "@/lib/admin/metrics";
import { DashboardTabs, Section, StatCard, TableCard, pct } from "../ui";

export const dynamic = "force-dynamic";

// Growth dashboard — acquisition, activation and retention.
export default async function GrowthDashboardPage() {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");

  const m = await growthMetrics();
  const signups7d = m.signupsByDay.reduce((s, d) => s + d.signups, 0);
  const maxDay = Math.max(1, ...m.signupsByDay.map((d) => d.signups));

  return (
    <AdminShell adminEmail={session.email}>
      <div className="px-6 py-6">
        <h1 className="mb-1 font-heading text-2xl font-bold text-indigo">Growth</h1>
        <p className="mb-5 text-sm text-indigo/55">Acquisition, referral conversion and retention.</p>
        <DashboardTabs active="growth" />

        <Section title="Acquisition">
          <StatCard label="Signups (7 days)" value={signups7d.toLocaleString()} />
          <StatCard label="First transactions today" value={m.firstTxnToday.toLocaleString()} tone="good" />
          <StatCard label="Referred users" value={m.referredTotal.toLocaleString()} href="/admin/referrals" />
          <StatCard label="Referral conversion" value={pct(m.referralConversionRate)} sub="referred users who transacted" href="/admin/referrals" />
          <StatCard label="Repeat rate (30d)" value={pct(m.repeatRate30d)} sub="active users with 2+ purchases" />
        </Section>

        <Section title="Signups by day (last 7 days)">
          <div className="col-span-2 rounded-2xl border border-indigo/10 bg-white p-4 md:col-span-4">
            {m.signupsByDay.length === 0 ? (
              <p className="text-sm text-indigo/45">No signups in the last 7 days.</p>
            ) : (
              <div className="flex items-end gap-2" style={{ height: 120 }}>
                {m.signupsByDay.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-[10px] font-semibold text-indigo/70">{d.signups}</span>
                    <div
                      className="w-full rounded-t bg-raviion-green"
                      style={{ height: `${Math.max((d.signups / maxDay) * 90, 4)}px` }}
                    />
                    <span className="text-[9px] text-indigo/40">{d.day.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section title="Country distribution">
          <TableCard
            title="Users by country"
            rows={m.countryDistribution.map((c) => ({
              label: c.country,
              value: c.users.toLocaleString(),
            }))}
          />
        </Section>

        <Section title="Campaigns">
          <TableCard
            title="Marketing tools"
            rows={[
              { label: "Notification campaigns", value: "→", sub: "Blasts, delivery and analytics", href: "/admin/notifications" },
              { label: "Referral program", value: "→", sub: "Codes, conversions and payouts", href: "/admin/referrals" },
              { label: "In-app messages", value: "→", sub: "Homepage carousel campaigns", href: "/admin/notifications" },
            ]}
          />
        </Section>
      </div>
    </AdminShell>
  );
}
