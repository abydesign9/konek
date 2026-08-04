"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Shared marketing-site header: Products / Company mega-dropdowns, Pricing and
// Support links, plus Log in / Get started. Used by every public page so the
// nav is identical everywhere. Kept dependency-free (no external UI lib) so it
// works under the strict nonce CSP.

type Item = { label: string; href: string; desc: string };

const PRODUCTS: Item[] = [
  { label: "Personal", href: "/personal", desc: "Accounts, cards & connectivity for everyday life" },
  { label: "Business", href: "/business-solutions", desc: "Pay your team, collect globally, control spend" },
  { label: "Connectivity", href: "/connectivity", desc: "eSIM, airtime, data, bills, TV & more" },
];

const PRODUCT_LINKS: Item[] = [
  { label: "USD & multi-currency accounts", href: "/personal#accounts", desc: "Receive and hold USD, GBP, EUR and NGN" },
  { label: "Virtual cards", href: "/personal#cards", desc: "Spend online anywhere, in any currency" },
  { label: "Global eSIM", href: "/connectivity#esim", desc: "Data in 190+ countries, activated in seconds" },
  { label: "Bills & VAS", href: "/connectivity#bills", desc: "Airtime, data, electricity, cable & exams" },
];

const COMPANY: Item[] = [
  { label: "About us", href: "/about", desc: "Our mission to connect Africa to the world" },
  { label: "Careers", href: "/company/careers", desc: "Build the connectivity layer for a continent" },
  { label: "Blog", href: "/company/blog", desc: "Product updates, news and money tips" },
];

const COMMUNITY: Item[] = [
  { label: "Referrals", href: "/referrals", desc: "Invite friends and earn rewards" },
  { label: "Campus Ambassadors", href: "/ambassadors", desc: "Represent Konek on campus and get paid" },
  { label: "Influencers", href: "/influencers", desc: "Create content for Konek and earn" },
  { label: "Creator Club", href: "/creator-club", desc: "Perks and tools for creators paid globally" },
];

const SUPPORT: Item[] = [
  { label: "Help Center", href: "/help", desc: "Get help anytime — our team is here 24/7" },
  { label: "FAQs", href: "/faq", desc: "Answers to common questions about Konek" },
  { label: "Video Guides", href: "/help/videos", desc: "Step-by-step videos showing how to use Konek" },
];

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="transition-transform group-hover:rotate-180">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Dropdown({ title, items, links }: { title: string; items: Item[]; links?: Item[] }) {
  return (
    <div className="group relative">
      <button className="flex items-center gap-1 py-2 text-sm font-semibold text-indigo/80 hover:text-indigo">
        {title} <Chevron />
      </button>
      <div className="invisible absolute left-1/2 top-full z-30 w-[340px] -translate-x-1/2 pt-3 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
        <div className="konek-card-shadow overflow-hidden rounded-2xl border border-indigo/10 bg-white p-2">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-indigo/5">
              <span className="block text-sm font-semibold text-indigo">{it.label}</span>
              <span className="block text-xs text-indigo/55">{it.desc}</span>
            </Link>
          ))}
          {links && (
            <>
              <div className="my-2 border-t border-indigo/5" />
              {links.map((it) => (
                <Link key={it.href} href={it.href} className="block rounded-xl px-3 py-2 transition-colors hover:bg-indigo/5">
                  <span className="block text-[13px] font-semibold text-indigo">{it.label}</span>
                  <span className="block text-[11px] text-indigo/50">{it.desc}</span>
                </Link>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  // Detect an existing session so we don't show "Log in / Get started" to a
  // signed-in user browsing public pages — show "Go to app" instead.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/session/status")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setAuthed(!!d.authed); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-indigo/10 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/brand/konek-logo.svg" alt="Konek" width={32} height={32} className="h-8 w-8" unoptimized />
          <span className="font-heading text-lg font-bold tracking-tight text-indigo">KONEK</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <Dropdown title="Products" items={PRODUCTS} links={PRODUCT_LINKS} />
          <Dropdown title="Company" items={COMPANY} links={COMMUNITY} />
          <Link href="/pricing" className="py-2 text-sm font-semibold text-indigo/80 hover:text-indigo">Pricing</Link>
          <Dropdown title="Support" items={SUPPORT} />
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {authed ? (
            <Link href="/home" className="rounded-full bg-indigo px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-konek-green">
              Go to app
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-semibold text-indigo hover:text-konek-green">Log in</Link>
              <Link href="/signup" className="rounded-full bg-indigo px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-konek-green">
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo/15 md:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d={open ? "M6 6l12 12M6 18L18 6" : "M4 7h16M4 12h16M4 17h16"} stroke="#22315C" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-indigo/10 bg-background px-5 py-4 md:hidden">
          <p className="mb-1 px-1 text-[11px] font-bold uppercase tracking-wide text-indigo/40">Products</p>
          {PRODUCTS.map((it) => (
            <Link key={it.href} href={it.href} className="block rounded-xl px-1 py-2.5 text-sm font-semibold text-indigo">{it.label}</Link>
          ))}
          <p className="mb-1 mt-3 px-1 text-[11px] font-bold uppercase tracking-wide text-indigo/40">Company</p>
          {[...COMPANY, ...COMMUNITY].map((it) => (
            <Link key={it.href} href={it.href} className="block rounded-xl px-1 py-2.5 text-sm font-semibold text-indigo">{it.label}</Link>
          ))}
          <Link href="/pricing" className="block rounded-xl px-1 py-2.5 text-sm font-semibold text-indigo">Pricing</Link>
          <p className="mb-1 mt-3 px-1 text-[11px] font-bold uppercase tracking-wide text-indigo/40">Support</p>
          {SUPPORT.map((it) => (
            <Link key={it.href} href={it.href} className="block rounded-xl px-1 py-2.5 text-sm font-semibold text-indigo">{it.label}</Link>
          ))}
          <div className="mt-4 flex gap-3">
            {authed ? (
              <Link href="/home" className="flex-1 rounded-full bg-indigo py-2.5 text-center text-sm font-semibold text-white">Go to app</Link>
            ) : (
              <>
                <Link href="/login" className="flex-1 rounded-full border border-indigo/20 py-2.5 text-center text-sm font-semibold text-indigo">Log in</Link>
                <Link href="/signup" className="flex-1 rounded-full bg-indigo py-2.5 text-center text-sm font-semibold text-white">Get started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
