"use client";

import { usePathname } from "next/navigation";
import { whatsappLink } from "@/lib/contact";

// Floating "Hey there!" live-chat bubble (Plug.ng-style) that opens WhatsApp.
// Rendered once from the root layout; shown on customer app surfaces, hidden on
// marketing/auth/admin and focused flows (KYC, PIN pad, checkout) where a
// floating control would get in the way. Sits above the bottom tab bar.
const HIDE_PREFIXES = ["/admin", "/login", "/signup", "/kyc"];
const HIDE_EXACT = ["/", "/support"]; // support already has its own chat CTA

export function LiveChatBubble() {
  const pathname = usePathname();

  const hidden =
    HIDE_EXACT.includes(pathname) || HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  // Only show on real app pages (anything under the customer shell).
  const isAppPage =
    ["/home", "/wallet", "/connect", "/buy", "/cards", "/esim", "/agent", "/invite", "/rewards", "/profile", "/notifications", "/business"].some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );

  if (hidden || !isAppPage) return null;

  return (
    <a
      href={whatsappLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with support on WhatsApp"
      title="Live chat"
      className="raviion-tile fixed right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-raviion-green text-xl text-white shadow-lg active:scale-95"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 84px)", touchAction: "manipulation" }}
    >
      💬
    </a>
  );
}
