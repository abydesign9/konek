import Link from "next/link";
import type { ReactNode } from "react";

// Shared building blocks for the layered admin dashboards (server-safe).

export function naira(minor: number): string {
  return `₦${(minor / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function usd(minor: number): string {
  return `$${(minor / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function pct(v: number): string {
  return `${(v * 100).toFixed(0)}%`;
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo/40">{title}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  sub,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const valueClass =
    tone === "good" ? "text-konek-green" : tone === "warn" ? "text-gold" : tone === "bad" ? "text-red-600" : "text-indigo";
  const inner = (
    <>
      <p className="text-xs text-indigo/55">{label}</p>
      <p className={`mt-1 font-heading text-xl font-bold leading-tight ${valueClass}`}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-indigo/45">{sub}</p>}
    </>
  );
  const className = "rounded-2xl border border-indigo/10 bg-white p-4" + (href ? " konek-tile hover:border-indigo/30" : "");
  return href ? (
    <Link href={href} className={className}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}

export function TableCard({
  title,
  rows,
  href,
}: {
  title: string;
  rows: { label: string; value: string; sub?: string; href?: string }[];
  href?: string;
}) {
  return (
    <div className="col-span-2 rounded-2xl border border-indigo/10 bg-white p-4 md:col-span-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-indigo">{title}</p>
        {href && (
          <Link href={href} className="text-xs font-semibold text-konek-green">
            View all →
          </Link>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-indigo/45">No data yet.</p>
      ) : (
        <div className="flex flex-col">
          {rows.map((r, i) => {
            const content = (
              <div className="flex items-center justify-between border-b border-indigo/5 py-2 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-indigo">{r.label}</p>
                  {r.sub && <p className="text-xs text-indigo/45">{r.sub}</p>}
                </div>
                <p className="ml-3 shrink-0 text-sm font-semibold text-indigo">{r.value}</p>
              </div>
            );
            return r.href ? (
              <Link key={i} href={r.href} className="hover:bg-indigo/5">
                {content}
              </Link>
            ) : (
              <div key={i}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const DASHBOARDS = [
  { key: "executive", label: "Executive", href: "/admin/dashboard" },
  { key: "ops", label: "Operations", href: "/admin/dashboard/ops" },
  { key: "finance", label: "Finance", href: "/admin/dashboard/finance" },
  { key: "growth", label: "Growth", href: "/admin/dashboard/growth" },
  { key: "business", label: "Business", href: "/admin/dashboard/business" },
  { key: "agents", label: "Agents", href: "/admin/dashboard/agents" },
  { key: "support", label: "Support", href: "/admin/dashboard/support" },
] as const;

export function DashboardTabs({ active }: { active: (typeof DASHBOARDS)[number]["key"] }) {
  return (
    <div className="konek-scrollbar-none mb-6 flex gap-2 overflow-x-auto">
      {DASHBOARDS.map((d) => (
        <Link
          key={d.key}
          href={d.href}
          className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ${
            d.key === active ? "bg-indigo text-white" : "bg-indigo/10 text-indigo/70 hover:bg-indigo/15"
          }`}
        >
          {d.label}
        </Link>
      ))}
    </div>
  );
}
