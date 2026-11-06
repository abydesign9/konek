"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";

// Renders the five-tab bottom nav ONCE, from the root layout, so it is fixed
// and identical on every customer screen — it never disappears or jumps
// between navigations (native-app chrome, like a real tab bar). Pages must not
// render <BottomNav/> themselves.
//
// Shown on customer app surfaces; hidden on marketing/auth/admin and inside
// focused flows (KYC) where a tab bar would invite abandoning the flow.
// Also hidden on /business — that hub has its own complete nav shell
// (BusinessShell: sidebar on desktop, drawer + header on mobile, with its
// own "Back to raviion" link), so this bar would just duplicate/collide with it.
const SHOW_PREFIXES = [
  "/home",
  "/wallet",
  "/connect",
  "/buy",
  "/esim",
  "/cards",
  "/agent",
  "/invite",
  "/notifications",
  "/support",
  "/rewards",
  "/profile",
  "/settings",
  "/squads",
  "/leaderboard",
  "/voice",
  "/transactions",
];

export function BottomNavGate() {
  const pathname = usePathname();
  const show = SHOW_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!show) return null;

  return (
    <>
      {/* In-flow spacer so the last content on any page can scroll clear of the
          fixed bar without every page needing its own bottom padding. */}
      <div aria-hidden className="h-24" />
      <BottomNav />
    </>
  );
}
