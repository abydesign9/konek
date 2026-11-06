"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// Business console shell — deliberately its own visual language, distinct
// from both the customer app's mobile-first bottom-nav chrome and the
// internal admin ops dashboard. A business owner is closer to a Stripe
// Dashboard / Notion user than either of those: fixed left sidebar,
// generous whitespace, one concern per screen instead of everything
// stacked on a single page.
type IconProps = { className?: string };

function NavIcon({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={path} />
    </svg>
  );
}

export const BizIcons = {
  Overview: (p: IconProps) => <NavIcon {...p} path="M3 12h4v8H3zM10 4h4v16h-4zM17 8h4v12h-4z" />,
  Employees: (p: IconProps) => <NavIcon {...p} path="M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11ZM2.7 19.5c.8-3.4 3.3-5.3 6.3-5.3s5.5 1.9 6.3 5.3M16.5 5a3 3 0 0 1 0 6M18.5 14.6c2.1.4 3.4 1.9 4 4.3" />,
  Distributions: (p: IconProps) => <NavIcon {...p} path="M4 12h9M4 12l3.5-3.5M4 12l3.5 3.5M20 6h-9M20 6l-3.5-3.5M20 6l-3.5 3.5M4 18h16" />,
  Cards: (p: IconProps) => <NavIcon {...p} path="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7ZM3 10h18M7 15h4" />,
  Vendors: (p: IconProps) => <NavIcon {...p} path="M4 21V9l8-5 8 5v12M9 21v-6h6v6M4 9h16" />,
  Recurring: (p: IconProps) => <NavIcon {...p} path="M20 11a8 8 0 1 0-2.3 5.6M20 5v6h-6" />,
  Campaigns: (p: IconProps) => <NavIcon {...p} path="M4 4v16M4 5h13l-2.5 3.5L17 12H4" />,
  Reports: (p: IconProps) => <NavIcon {...p} path="M4 20V10M10 20V4M16 20v-7M4 20h16" />,
  Api: (p: IconProps) => <NavIcon {...p} path="m8 6-5 6 5 6M16 6l5 6-5 6M13.5 4l-3 16" />,
  Settings: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  ),
  Menu: (p: IconProps) => <NavIcon {...p} path="M3 6h18M3 12h18M3 18h18" />,
  Logout: (p: IconProps) => <NavIcon {...p} path="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  Back: (p: IconProps) => <NavIcon {...p} path="M19 12H5M12 19l-7-7 7-7" />,
};

const NAV = [
  { label: "Overview", href: "/business", Icon: BizIcons.Overview },
  { label: "Cards", href: "/business/cards", Icon: BizIcons.Cards },
  { label: "Vendors", href: "/business/vendors", Icon: BizIcons.Vendors },
  { label: "Employees", href: "/business/employees", Icon: BizIcons.Employees },
  { label: "Distributions", href: "/business/distributions", Icon: BizIcons.Distributions },
  { label: "Recurring Benefits", href: "/business/recurring", Icon: BizIcons.Recurring },
  { label: "Campaigns", href: "/business/campaigns", Icon: BizIcons.Campaigns },
  { label: "Reports", href: "/business/reports", Icon: BizIcons.Reports },
  { label: "API", href: "/business/api", Icon: BizIcons.Api },
  { label: "Settings", href: "/business/settings", Icon: BizIcons.Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/business") return pathname === "/business";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({ pathname, businessName, onNavigate }: { pathname: string; businessName?: string; onNavigate?: () => void }) {
  return (
    <nav className="flex h-full flex-col px-3 py-6">
      <Link href="/business" className="mb-1 flex items-center gap-2 px-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo font-heading text-sm font-bold text-white">
          {(businessName ?? "K").charAt(0).toUpperCase()}
        </div>
        <span className="min-w-0 truncate font-heading text-sm font-bold text-indigo">{businessName ?? "Business"}</span>
      </Link>
      <p className="mb-6 px-3 text-[11px] text-indigo/40">raviion for Business</p>

      <div className="flex-1 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.Icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? "bg-indigo/10 text-indigo" : "text-indigo/55 hover:bg-hover-tint hover:text-indigo"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <Link
        href="/home"
        onClick={onNavigate}
        className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-indigo/45 hover:bg-hover-tint hover:text-indigo"
      >
        <BizIcons.Back className="h-[18px] w-[18px] shrink-0" />
        Back to raviion
      </Link>
    </nav>
  );
}

export function BusinessShell({ businessName, children }: { businessName?: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ivory">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-border-soft bg-white lg:block">
        <SidebarContent pathname={pathname} businessName={businessName} />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[264px] bg-white shadow-xl">
            <SidebarContent pathname={pathname} businessName={businessName} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b border-border-soft bg-white px-3 lg:hidden">
          {pathname === "/business" ? (
            <button
              onClick={() => router.push("/home")}
              className="flex items-center gap-1 rounded-lg py-2 pl-1 pr-2 text-indigo hover:bg-hover-tint"
              aria-label="Back to raviion"
            >
              <BizIcons.Back className="h-5 w-5 shrink-0" />
            </button>
          ) : (
            <button
              onClick={() => router.push("/business")}
              className="flex items-center gap-1 rounded-lg py-2 pl-1 pr-2 text-indigo hover:bg-hover-tint"
              aria-label="Back to business overview"
            >
              <BizIcons.Back className="h-5 w-5 shrink-0" />
            </button>
          )}
          <span className="min-w-0 flex-1 truncate text-center font-heading text-sm font-bold text-indigo">{businessName ?? "Business"}</span>
          <button onClick={() => setDrawerOpen(true)} className="rounded-lg p-2 text-indigo hover:bg-hover-tint" aria-label="Open menu">
            <BizIcons.Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
