"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconWallet, IconMore, IconHistory, IconProfile } from "./icons";
import type { ComponentType, SVGProps } from "react";

// The five real tabs: Home / Wallet / Connect / History / Profile. Every
// customer page renders this same nav (mobile-first bottom bar) — the one
// piece of chrome shared across the whole app, deliberately not shared
// with the admin shell's desktop sidebar (see AdminShell.tsx).
const TABS: { label: string; href: string; icon: ComponentType<SVGProps<SVGSVGElement>>; match: (p: string) => boolean }[] = [
  { label: "Home", href: "/home", icon: IconHome, match: (p) => p === "/home" },
  {
    label: "Wallet",
    href: "/wallet",
    icon: IconWallet,
    // History and receipts live under /wallet but belong to the History tab —
    // without the exclusion both tabs light up at once.
    match: (p) => p.startsWith("/wallet") && !p.startsWith("/wallet/history") && !p.startsWith("/wallet/receipt"),
  },
  {
    label: "Connect",
    href: "/connect",
    icon: IconMore,
    match: (p) =>
      p.startsWith("/connect") ||
      p.startsWith("/buy") ||
      p === "/esim" ||
      p.startsWith("/cards") ||
      p.startsWith("/business") ||
      p === "/agent",
  },
  {
    label: "History",
    href: "/wallet/history",
    icon: IconHistory,
    match: (p) => p.startsWith("/wallet/history") || p.startsWith("/wallet/receipt"),
  },
  { label: "Profile", href: "/profile", icon: IconProfile, match: (p) => p.startsWith("/profile") || p.startsWith("/settings") },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="konek-card-shadow fixed bottom-0 left-0 right-0 z-30 border-t border-indigo/10 bg-white/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-1.5">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className="konek-tile flex min-w-[56px] flex-col items-center gap-0.5 py-1"
            >
              <span
                className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                  active ? "bg-indigo/10" : ""
                }`}
              >
                <Icon className={`h-5 w-5 transition-colors ${active ? "text-indigo" : "text-indigo/40"}`} />
              </span>
              <span className={`text-[11px] leading-none ${active ? "font-bold text-indigo" : "font-medium text-indigo/45"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
