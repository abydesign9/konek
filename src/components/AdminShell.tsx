"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BellIcon,
  ChevronDownIcon,
  DashboardIcon,
  LogoutIcon,
  MenuIcon,
  ProvidersIcon,
  RatesIcon,
  ReferralsIcon,
  SearchIcon,
  SettingsIcon,
  SupportIcon,
  UsersIcon,
} from "./adminIcons";

// Desktop-first ops dashboard shell (Stripe/Linear/Vercel-style) — deliberately
// separate from the customer app's mobile-first PageHeader/bottom-nav
// language. Fixed sidebar + sticky topnav on desktop; collapses to a drawer
// on mobile. Nav points at the real, fully-built pages (not stubs).
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: DashboardIcon }],
  },
  {
    label: "Operations",
    items: [
      { label: "Rates", href: "/admin/rates", icon: RatesIcon },
      { label: "Users & Roles", href: "/admin/users", icon: UsersIcon },
      { label: "Referrals", href: "/admin/referrals", icon: ReferralsIcon },
      { label: "Support", href: "/admin/support", icon: SupportIcon },
      { label: "Providers", href: "/admin/providers", icon: ProvidersIcon },
    ],
  },
  {
    label: "Marketing",
    items: [{ label: "Notifications", href: "/admin/notifications", icon: BellIcon }],
  },
  {
    label: "Configuration",
    items: [{ label: "Settings", href: "/admin/settings", icon: SettingsIcon }],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex h-full flex-col px-3 py-6">
      <div className="mb-8 flex items-center gap-2 px-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 font-heading text-sm font-bold text-white">
          K
        </div>
        <span className="font-heading text-base font-bold text-white">KONEK Admin</span>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-white/40">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}

interface OpsAlertItem {
  id: string;
  type: "ticket" | "provider" | "kyb" | "fraud";
  label: string;
  detail: string;
  href: string;
  created_at: string;
}

const OPS_ALERT_ICON: Record<OpsAlertItem["type"], string> = {
  ticket: "🎫",
  provider: "🔌",
  kyb: "🏢",
  fraud: "🚩",
};

export function AdminShell({ adminEmail, children }: { adminEmail?: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [opsTotal, setOpsTotal] = useState(0);
  const [opsItems, setOpsItems] = useState<OpsAlertItem[]>([]);

  async function loadOpsAlerts() {
    const res = await fetch("/api/admin/ops-alerts");
    if (!res.ok) return;
    const data = await res.json();
    setOpsTotal(data.total ?? 0);
    setOpsItems(data.items ?? []);
  }

  useEffect(() => {
    loadOpsAlerts();
    // Real unread counts (open tickets, unhealthy providers, pending KYB,
    // open fraud items) — polled since there's no push/websocket layer yet.
    const interval = setInterval(loadOpsAlerts, 30_000);
    return () => clearInterval(interval);
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="min-h-screen bg-ivory">
      {/* Desktop fixed sidebar — 272px, full height */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] bg-indigo lg:block">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[272px] bg-indigo shadow-xl">
            <SidebarContent pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[272px]">
        {/* Sticky top nav */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border-soft bg-white px-4 sm:px-6">
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-2 text-indigo hover:bg-hover-tint lg:hidden"
            aria-label="Open menu"
          >
            <MenuIcon className="h-5 w-5" />
          </button>

          <div className="relative hidden max-w-md flex-1 sm:block">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search users, transactions, businesses…"
              className="w-full rounded-lg border border-border-soft bg-ivory py-2 pl-9 pr-3 text-sm text-indigo placeholder:text-text-secondary focus:border-indigo focus:outline-none focus:ring-1 focus:ring-indigo"
            />
          </div>

          <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
            <div className="relative">
              <button
                onClick={() => {
                  setBellOpen((v) => !v);
                  setProfileOpen(false);
                }}
                className="relative rounded-lg p-2 text-indigo hover:bg-hover-tint"
                aria-label="Notifications"
              >
                <BellIcon className="h-5 w-5" />
                {opsTotal > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-white">
                    {opsTotal > 9 ? "9+" : opsTotal}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border-soft bg-white p-1.5 shadow-lg">
                  <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
                    {opsTotal === 0 ? "All clear" : `${opsTotal} item${opsTotal === 1 ? "" : "s"} need attention`}
                  </p>
                  <div className="max-h-80 overflow-y-auto">
                    {opsItems.length === 0 ? (
                      <p className="px-3 py-4 text-center text-sm text-text-secondary">Nothing to review right now.</p>
                    ) : (
                      opsItems.map((item) => (
                        <Link
                          key={`${item.type}-${item.id}`}
                          href={item.href}
                          onClick={() => setBellOpen(false)}
                          className="flex items-start gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-hover-tint"
                        >
                          <span className="text-base leading-5">{OPS_ALERT_ICON[item.type]}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-indigo">{item.label}</span>
                            <span className="block truncate text-xs text-text-secondary">{item.detail}</span>
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-hover-tint"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo/10 text-xs font-bold text-indigo">
                  {(adminEmail ?? "A").slice(0, 2).toUpperCase()}
                </div>
                {adminEmail && (
                  <span className="hidden text-sm font-medium text-indigo md:inline">{adminEmail}</span>
                )}
                <ChevronDownIcon className="hidden h-4 w-4 text-text-secondary md:inline" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border-soft bg-white p-1.5 shadow-lg">
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-indigo hover:bg-hover-tint"
                  >
                    <LogoutIcon className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Full-width content — no centered max-w container on desktop */}
        <main className="px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
