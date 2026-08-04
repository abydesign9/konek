"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconWallet, IconMore, IconCard, IconProfile } from "./icons";
import type { ComponentType, SVGProps } from "react";

// The five real tabs: Home / Connect / Wallets / Cards / Profile. Rendered once
// from the root layout (see BottomNavGate) so it's a fixed, persistent tab bar.
// Each tab has its OWN accent colour when active, so the current section is
// instantly readable at a glance.
interface Tab {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  color: string; // active accent
  tint: string; // active pill background
  match: (p: string) => boolean;
}

const TABS: Tab[] = [
  { label: "Home", href: "/home", icon: IconHome, color: "#1F3864", tint: "rgba(31,56,100,0.12)", match: (p) => p === "/home" },
  {
    label: "Connect",
    href: "/connect",
    icon: IconMore,
    color: "#F5A623",
    tint: "rgba(245,166,35,0.16)",
    match: (p) =>
      p.startsWith("/connect") ||
      p.startsWith("/buy") ||
      p === "/esim" ||
      p === "/marketplace" ||
      p === "/agent",
  },
  {
    label: "Wallets",
    href: "/wallet",
    icon: IconWallet,
    color: "#00C48C",
    tint: "rgba(0,196,140,0.15)",
    match: (p) => p.startsWith("/wallet"),
  },
  {
    label: "Cards",
    href: "/cards",
    icon: IconCard,
    color: "#3B82F6",
    tint: "rgba(59,130,246,0.14)",
    match: (p) => p.startsWith("/cards"),
  },
  {
    label: "Profile",
    href: "/profile",
    icon: IconProfile,
    color: "#8B5CF6",
    tint: "rgba(139,92,246,0.14)",
    match: (p) => p.startsWith("/profile") || p.startsWith("/settings"),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="konek-card-shadow fixed bottom-0 left-0 right-0 z-30 border-t border-indigo/10 bg-white/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex w-full max-w-3xl items-stretch justify-between px-2 py-1.5 sm:px-6 sm:py-2 md:px-12 lg:max-w-5xl lg:px-20">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className="group flex min-w-[56px] flex-1 flex-col items-center gap-0.5 py-1 transition-transform duration-100 active:scale-90 sm:gap-1"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              <span
                className="flex h-8 w-14 items-center justify-center rounded-full transition-all duration-150 sm:h-9 sm:w-16 md:h-10 md:w-20"
                style={{ backgroundColor: active ? tab.tint : "transparent" }}
              >
                <Icon
                  className="h-5 w-5 transition-colors duration-150 sm:h-[22px] sm:w-[22px] md:h-6 md:w-6"
                  style={{ color: active ? tab.color : "rgba(31,56,100,0.4)" }}
                />
              </span>
              <span
                className="text-[11px] leading-none transition-colors duration-150 sm:text-xs md:text-sm"
                style={{ color: active ? tab.color : "rgba(31,56,100,0.45)", fontWeight: active ? 700 : 500 }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
