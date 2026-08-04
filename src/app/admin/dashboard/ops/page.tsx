import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { opsMetrics } from "@/lib/admin/metrics";
import { txnTypeLabel } from "@/lib/format";
import { DashboardTabs, Section, StatCard, TableCard, naira } from "../ui";

export const dynamic = "force-dynamic";

// Operations dashboard — not revenue; running the platform.
export default async function OpsDashboardPage() {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");

  const m = await opsMetrics();

  return (
    <AdminShell adminEmail={session.email}>
      <div className="px-6 py-6">
        <h1 className="mb-1 font-heading text-2xl font-bold text-indigo">Operations</h1>
        <p className="mb-5 text-sm text-indigo/55">Provider health, queues and everything that keeps Konek running.</p>
        <DashboardTabs active="ops" />

        <Section title="Provider health (last hour)">
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
                  sub={`${p.calls} calls · p50 ${p.latencyP50Ms ?? "—"}ms · p95 ${p.latencyP95Ms ?? "—"}ms${
                    p.circuitOpen > 0 ? " · ⚡ circuit open" : ""
                  }`}
                  tone={p.successRatePct === null ? "default" : rate >= 98 ? "good" : rate >= 90 ? "warn" : "bad"}
                  href="/admin/providers"
                />
              );
            })
          )}
        </Section>

        <Section title="Queues">
          <StatCard label="Fraud queue" value={m.fraudOpen.toLocaleString()} tone={m.fraudOpen > 0 ? "bad" : "default"} href="/admin/users" />
          <StatCard label="KYC queue" value={m.kycPending.toLocaleString()} tone={m.kycPending > 0 ? "warn" : "default"} href="/admin/kyc" />
          <StatCard label="Business verifications" value={m.businessPending.toLocaleString()} tone={m.businessPending > 0 ? "warn" : "default"} href="/admin" />
          <StatCard label="Agent applications" value={m.agentsPending.toLocaleString()} tone={m.agentsPending > 0 ? "warn" : "default"} href="/admin" />
          <StatCard label="Open support tickets" value={(m.support.open + m.support.assigned).toLocaleString()} href="/admin/support" />
          <StatCard label="SLA breached" value={m.support.slaBreached.toLocaleString()} tone={m.support.slaBreached > 0 ? "bad" : "default"} href="/admin/support" />
          <StatCard label="Held reservations" value={m.reservationsHeld.toLocaleString()} sub="funds on hold awaiting settle/release" />
          <StatCard label="Webhook failures (24h)" value={m.webhookFailures24h.toLocaleString()} tone={m.webhookFailures24h > 0 ? "warn" : "default"} />
        </Section>

        <Section title="Stuck transactions (pending > 10 min)">
          <TableCard
            title={`${m.pendingTxns.length} transaction${m.pendingTxns.length === 1 ? "" : "s"} need attention`}
            rows={m.pendingTxns.map((t) => ({
              label: `${txnTypeLabel(t.type)} · ${naira(Number(t.amount_minor))}`,
              value: t.status,
              sub: new Date(t.created_at).toLocaleString(),
            }))}
          />
        </Section>
      </div>
    </AdminShell>
  );
}
