"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { IconChevronRight } from "@/components/icons";

interface ProfileData {
  phone: string | null;
  full_name: string | null;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  address: string | null;
  kyc_status: string;
}

// Non-vanity completeness: each item is a real thing the user benefits from
// finishing. Verification is last because it unlocks funding/accounts.
function completeness(p: ProfileData): { pct: number; nextHref: string; nextLabel: string } | null {
  const items: { done: boolean; href: string; label: string }[] = [
    { done: !!p.full_name, href: "/profile/account", label: "Add your name" },
    { done: !!p.username, href: "/profile/account", label: "Pick a username" },
    { done: !!p.avatar_url, href: "/profile/account", label: "Choose an avatar" },
    { done: !!p.email, href: "/profile/account", label: "Add your email" },
    { done: !!p.date_of_birth, href: "/profile/account", label: "Add your date of birth" },
    { done: !!p.address, href: "/profile/account", label: "Add your address" },
    { done: p.kyc_status === "verified", href: "/profile/verification", label: "Verify your identity" },
  ];
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  if (pct >= 100) return null;
  const next = items.find((i) => !i.done)!;
  return { pct, nextHref: next.href, nextLabel: next.label };
}

// Grouped-list menu: one card per group with hairline dividers — quieter and
// more scannable than a stack of separate cards.
// Simple, scannable list in the 1App style — icon + label + chevron, grouped
// lightly. No busy subtitles.
const GROUPS: { title: string; rows: { icon: string; label: string; sub?: string; href: string; badge?: (p: ProfileData) => string | null }[] }[] = [
  {
    title: "Account",
    rows: [
      { icon: "👤", label: "Account information", href: "/profile/account" },
      {
        icon: "🛡️",
        label: "Account verification",
        href: "/profile/verification",
        badge: (p) => (p.kyc_status === "verified" ? "Verified" : "Action needed"),
      },
    ],
  },
  {
    title: "Money",
    rows: [
      { icon: "💳", label: "Cards", href: "/cards" },
      { icon: "🧾", label: "Transactions", href: "/wallet/history" },
      { icon: "🏦", label: "Payout account", href: "/settings/payout" },
    ],
  },
  {
    title: "More",
    rows: [
      { icon: "🤝", label: "Partner with Konek", href: "/agent" },
      { icon: "⚙️", label: "Settings", href: "/settings" },
      { icon: "💬", label: "Support", href: "/support" },
      { icon: "ℹ️", label: "About Konek", href: "/profile/about" },
    ],
  },
];

export function ProfileClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d: ProfileData) => setProfile(d));
  }, []);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const c = profile ? completeness(profile) : null;

  return (
    <div className="mx-auto max-w-lg px-5 pb-6">
      {/* ---------- Hero: identity + completeness in one seamless card ---------- */}
      <div className="konek-hero overflow-hidden rounded-3xl text-white">
        <Link href="/profile/account" className="konek-tile flex items-center gap-4 px-6 pb-5 pt-6">
          {profile ? (
            <Avatar
              value={profile.avatar_url}
              name={profile.full_name || profile.email || profile.phone}
              size={60}
              className="ring-2 ring-white/25"
            />
          ) : (
            <span className="h-[60px] w-[60px] shrink-0 animate-pulse rounded-full bg-white/20" />
          )}
          <div className="min-w-0 flex-1">
            {profile ? (
              <>
                <p className="truncate font-heading text-xl font-bold">{profile.full_name || "Add your name"}</p>
                <p className="truncate text-sm text-white/65">
                  {profile.username ? `@${profile.username}` : profile.email || profile.phone || "Complete your profile"}
                </p>
              </>
            ) : (
              <div className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-white/20" />
                <div className="h-3 w-44 animate-pulse rounded bg-white/10" />
              </div>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">Edit</span>
        </Link>

        {c && (
          <Link href={c.nextHref} className="block border-t border-white/10 bg-white/5 px-6 py-3.5">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-white/80">Profile {c.pct}% complete</span>
              <span className="font-semibold text-konek-green">{c.nextLabel} →</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-konek-green transition-all" style={{ width: `${c.pct}%` }} />
            </div>
          </Link>
        )}
      </div>

      {/* ---------- Grouped menu ---------- */}
      {GROUPS.map((group) => (
        <section key={group.title} className="mt-6">
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-indigo/40">{group.title}</p>
          <div className="konek-card-shadow overflow-hidden rounded-2xl bg-white">
            {group.rows.map((row, i) => {
              const badge = profile && row.badge ? row.badge(profile) : null;
              return (
                <Link
                  key={row.href}
                  href={row.href}
                  className={`flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-indigo/[0.03] active:bg-indigo/5 ${
                    i > 0 ? "border-t border-indigo/5" : ""
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo/5 text-lg">
                    {row.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-indigo">{row.label}</span>
                    {row.sub && <span className="block truncate text-xs text-indigo/50">{row.sub}</span>}
                  </span>
                  {badge && (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        badge === "Verified" ? "bg-konek-green/15 text-konek-green" : "bg-gold/15 text-gold"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                  <IconChevronRight className="h-4 w-4 shrink-0 text-indigo/25" />
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {/* ---------- Log out ---------- */}
      <button
        onClick={logout}
        disabled={loggingOut}
        className="konek-card-shadow mt-6 w-full rounded-2xl bg-white px-4 py-3.5 text-center text-sm font-semibold text-red-600 disabled:opacity-50"
      >
        {loggingOut ? "Logging out…" : "Log out"}
      </button>

      <p className="mt-4 text-center text-[11px] text-indigo/35">
        Konek · Secured with encryption, PINs and fraud monitoring
      </p>
    </div>
  );
}
