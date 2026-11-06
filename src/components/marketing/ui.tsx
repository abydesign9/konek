import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

// Server-safe presentational primitives shared by every marketing page, so the
// pages themselves stay pure content + SEO metadata.

export function MarketingPage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

export function Hero({
  eyebrow,
  title,
  subtitle,
  primary = { label: "Get started", href: "/signup" },
  secondary,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  return (
    <section className="mx-auto max-w-6xl px-5 pt-16 pb-12 md:pt-24 md:pb-16">
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-raviion-green">{eyebrow}</p>
      <h1 className="max-w-3xl font-heading text-4xl font-bold leading-[1.05] tracking-tight text-indigo md:text-6xl">
        {title}
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-indigo/65">{subtitle}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={primary.href} className="rounded-full bg-indigo px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-raviion-green">
          {primary.label}
        </Link>
        {secondary && (
          <Link href={secondary.href} className="rounded-full border border-indigo/20 px-7 py-3.5 text-sm font-semibold text-indigo transition-colors hover:border-indigo/40">
            {secondary.label}
          </Link>
        )}
      </div>
    </section>
  );
}

export function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
  tint,
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  intro?: string;
  children: ReactNode;
  tint?: boolean;
}) {
  return (
    <section id={id} className={tint ? "bg-white" : ""}>
      <div className="mx-auto max-w-6xl px-5 py-14 md:py-20">
        {eyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-raviion-green">{eyebrow}</p>}
        {title && <h2 className="max-w-2xl font-heading text-3xl font-bold tracking-tight text-indigo md:text-4xl">{title}</h2>}
        {intro && <p className="mt-4 max-w-2xl text-lg text-indigo/60">{intro}</p>}
        <div className={title || eyebrow ? "mt-10" : ""}>{children}</div>
      </div>
    </section>
  );
}

export function FeatureGrid({ items }: { items: { icon: string; title: string; body: string }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <div key={it.title} className="raviion-card-shadow rounded-2xl border border-indigo/5 bg-white p-6">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-raviion-green/10 text-xl">{it.icon}</div>
          <h3 className="font-heading text-lg font-bold text-indigo">{it.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-indigo/60">{it.body}</p>
        </div>
      ))}
    </div>
  );
}

export function Stats({ items }: { items: { value: string; label: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-6 rounded-3xl bg-indigo p-8 text-white md:grid-cols-4">
      {items.map((s) => (
        <div key={s.label}>
          <p className="font-heading text-3xl font-bold md:text-4xl">{s.value}</p>
          <p className="mt-1 text-sm text-white/60">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

export function CTA({
  title,
  subtitle,
  primary = { label: "Get started", href: "/signup" },
  secondary,
}: {
  title: string;
  subtitle: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20">
      <div className="raviion-hero overflow-hidden rounded-3xl px-8 py-14 text-center text-white md:py-20">
        <h2 className="mx-auto max-w-2xl font-heading text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
        <p className="mx-auto mt-4 max-w-xl text-white/70">{subtitle}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={primary.href} className="rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-indigo transition-transform hover:scale-[1.03]">
            {primary.label}
          </Link>
          {secondary && (
            <Link href={secondary.href} className="rounded-full border border-white/30 px-7 py-3.5 text-sm font-semibold text-white">
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
