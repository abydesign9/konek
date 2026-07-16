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
  { label: "Wallet", href: "/wallet", icon: IconWallet, match: (p) => p.startsWith("/wallet") },
  { label: "Connect", href: "/connect", icon: IconMore, match: (p) => p.startsWith("/connect") || p.startsWith("/buy") || p === "/esim" || p.startsWith("/cards") || p.startsWith("/business") },
  { label: "History", href: "/wallet/history", icon: IconHistory, match: (p) => p.startsWith("/wallet/history") || p.startsWith("/wallet/receipt") },
  { label: "Profile", href: "/profile", icon: IconProfile, match: (p) => p === "/profile" || p.startsWith("/settings") },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t border-indigo/10 bg-white px-6 py-3 konek-card-shadow">
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center gap-0.5 ${active ? "text-indigo" : "text-indigo/45"}`}
          >
            <Icon className="h-5 w-5" />
            <span className={`text-[11px] ${active ? "font-semibold" : "font-medium"}`}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
