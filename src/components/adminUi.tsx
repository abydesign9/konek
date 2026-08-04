import type { ReactNode } from "react";

// Shared building blocks for the admin consoles — a dense, desktop-first
// 12-column grid in the Stripe/Linear/Vercel style AdminShell already
// established, distinct on purpose from the customer app's mobile-first
// components. Pages compose these instead of hand-rolling <section>/<div>
// stacks so spacing (24–32px) and card treatment stay consistent.

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-heading text-2xl font-bold text-indigo">{title}</h1>
      {description && <p className="mt-1 max-w-3xl text-sm text-text-secondary">{description}</p>}
    </div>
  );
}

export function Grid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 gap-6 lg:grid-cols-12 ${className ?? ""}`}>{children}</div>;
}

// Tailwind needs literal class names at build time — a lookup table
// instead of string interpolation (`lg:col-span-${n}`) so all spans are
// actually generated.
const COL_SPAN: Record<number, string> = {
  1: "lg:col-span-1", 2: "lg:col-span-2", 3: "lg:col-span-3", 4: "lg:col-span-4",
  5: "lg:col-span-5", 6: "lg:col-span-6", 7: "lg:col-span-7", 8: "lg:col-span-8",
  9: "lg:col-span-9", 10: "lg:col-span-10", 11: "lg:col-span-11", 12: "lg:col-span-12",
};

export function Col({ span, children, className }: { span: number; children: ReactNode; className?: string }) {
  return <div className={`col-span-1 ${COL_SPAN[span] ?? "lg:col-span-12"} ${className ?? ""}`}>{children}</div>;
}

export function Card({
  title,
  description,
  action,
  children,
  className,
  padding = true,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-border-soft bg-white shadow-sm ${padding ? "p-6" : ""} ${className ?? ""}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            {title && <h2 className="font-heading text-sm font-bold text-indigo">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-text-secondary">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

const STAT_TONE = {
  indigo: "text-indigo",
  green: "text-konek-green",
  gold: "text-gold",
  red: "text-red-600",
} as const;

export function StatCard({
  label,
  value,
  sub,
  tone = "indigo",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: keyof typeof STAT_TONE;
}) {
  return (
    <div className="rounded-2xl border border-border-soft bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={`mt-1.5 font-heading text-2xl font-bold ${STAT_TONE[tone]}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-text-secondary">{sub}</p>}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-text-secondary">{message}</p>;
}

const BADGE_TONE = {
  indigo: "bg-indigo/10 text-indigo",
  green: "bg-konek-green/15 text-konek-green",
  gold: "bg-gold/15 text-gold",
  red: "bg-red-100 text-red-700",
  neutral: "bg-disabled-bg text-text-secondary",
} as const;

export function Badge({
  children,
  tone = "neutral",
  uppercase = false,
}: {
  children: ReactNode;
  tone?: keyof typeof BADGE_TONE;
  uppercase?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${uppercase ? "uppercase tracking-wide" : ""} ${BADGE_TONE[tone]}`}
    >
      {children}
    </span>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return <th className="border-b border-border-soft pb-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-text-secondary">{children}</th>;
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={`border-b border-border-soft py-3 pr-4 ${className ?? ""}`}>{children}</td>;
}
