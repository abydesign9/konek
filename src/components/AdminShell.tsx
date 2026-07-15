"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Tabs grow as each M12 slice lands (Rates, Users/Roles, Referrals,
// Customer service, Messaging, Settings). Keeping this list here means
// every admin sub-page gets the same nav for free.
const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/rates", label: "Rates" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-background">
      <nav className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-indigo/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-3 pb-2">
          <div className="flex items-center justify-between mb-3">
            <span className="font-heading text-lg font-bold text-indigo">Konek Admin</span>
            <form action="/api/admin/logout" method="post">
              <button type="submit" className="text-xs text-indigo/50 underline">
                Log out
              </button>
            </form>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TABS.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active ? "bg-indigo text-white" : "bg-indigo/10 text-indigo/70 hover:bg-indigo/15"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">{children}</div>
    </main>
  );
}
