"use client";

import { usePathname } from "next/navigation";
import { whatsappLink } from "@/lib/contact";

// Floating "Hey there!" live-chat bubble (Plug.ng-style) that opens WhatsApp.
// Rendered once from the root layout; shown on customer app surfaces, hidden on
// marketing/auth/admin and focused flows (KYC, PIN pad, checkout) where a
// floating control would get in the way. Sits above the bottom tab bar.
const HIDE_PREFIXES = ["/admin", "/login", "/signup", "/kyc", "/timon-preview"];
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
      className="konek-tile fixed right-4 z-40 flex items-center gap-2 rounded-full bg-konek-green px-4 py-3 text-sm font-semibold text-white shadow-lg active:scale-95"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 78px)", touchAction: "manipulation" }}
    >
      <span className="text-base">💬</span>
      <span>Live chat</span>
    </a>
  );
}
