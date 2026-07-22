"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconHelp,
  IconProfile,
  IconShield,
  IconSliders,
  IconLink,
  IconInfo,
  IconChevronRight,
} from "@/components/icons";
import { Avatar } from "@/components/Avatar";

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
// finishing. Verification counts for two because it unlocks funding/accounts.
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

// Grouped by what the user is trying to do, not by internal feature name —
// same shape as the reference: Get help / Account / Privacy & security /
// Preferences / Connected accounts / About, then Log out on its own. Each
// row owns exactly one concern so future settings (biometrics, language,
// device sessions...) have an obvious home without adding new top-level
// rows here.
const CATEGORIES = [
  { label: "Get help", sub: "Contact support and resolve your issues", Icon: IconHelp, href: "/support" },
  {
    label: "Account information",
    sub: "Update your details, username, avatar and address",
    Icon: IconProfile,
    href: "/profile/account",
  },
  {
    label: "Verification",
    sub: "Verify your identity to unlock funding, accounts and cards",
    Icon: IconShield,
    href: "/profile/verification",
  },
  {
    label: "Privacy and security",
    sub: "Manage your PIN, 2-step verification, and biometrics",
    Icon: IconShield,
    href: "/settings",
  },
  {
    label: "Preferences",
    sub: "Customize notifications and appearance settings",
    Icon: IconSliders,
    href: "/settings/preferences",
  },
  {
    label: "Connected accounts",
    sub: "Manage your virtual cards and payment methods",
    Icon: IconLink,
    href: "/settings/connected-accounts",
  },
  { label: "About Konek", sub: "FAQs, terms and conditions, and contact options", Icon: IconInfo, href: "/profile/about" },
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

  return (
    <>
      {/* ---------- Identity card ---------- */}
      <section className="px-5">
        <Link
          href="/profile/account"
          className="konek-card-shadow konek-tile flex items-center gap-3 rounded-2xl bg-white px-5 py-5"
        >
          {profile ? (
            <>
              <Avatar value={profile.avatar_url} name={profile.full_name || profile.email || profile.phone} size={56} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-base font-bold text-indigo">
                  {profile.full_name || "Add your name"}
                </p>
                <p className="truncate text-sm text-indigo/55">
                  {profile.username ? `@${profile.username}` : profile.email || profile.phone || "Complete your profile"}
                </p>
              </div>
            </>
          ) : (
            // Loading skeleton — avoids the "?" avatar / placeholder text flash.
            <>
              <span className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-indigo/10" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-indigo/10" />
                <div className="h-3 w-44 animate-pulse rounded bg-indigo/5" />
              </div>
            </>
          )}
          <IconChevronRight className="h-4 w-4 shrink-0 text-indigo/30" />
        </Link>
      </section>

      {/* ---------- Completeness nudge ---------- */}
      {profile && (() => {
        const c = completeness(profile);
        if (!c) return null;
        return (
          <section className="mt-4 px-5">
            <Link href={c.nextHref} className="konek-card-shadow konek-tile block rounded-2xl bg-white px-5 py-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-indigo">Profile {c.pct}% complete</p>
                <span className="text-xs font-semibold text-konek-green">{c.nextLabel} →</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-indigo/10">
                <div className="h-full rounded-full bg-konek-green transition-all" style={{ width: `${c.pct}%` }} />
              </div>
            </Link>
          </section>
        );
      })()}

      {/* ---------- Grouped categories ---------- */}
      <section className="mt-6 flex flex-col gap-2.5 px-5">
        {CATEGORIES.map(({ label, sub, Icon, href }) => (
          <Link
            key={href}
            href={href}
            className="konek-card-shadow konek-tile flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo/10">
              <Icon className="h-5 w-5 text-indigo" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-indigo">{label}</span>
              <span className="block truncate text-xs leading-snug text-indigo/55">{sub}</span>
            </span>
            <IconChevronRight className="h-4 w-4 shrink-0 text-indigo/30" />
          </Link>
        ))}
      </section>

      {/* ---------- Logout ---------- */}
      <section className="mt-6 px-5">
        <button
          onClick={logout}
          disabled={loggingOut}
          className="konek-card-shadow w-full rounded-2xl bg-white px-4 py-3.5 text-center text-sm font-semibold text-red-600 disabled:opacity-50"
        >
          {loggingOut ? "Logging out…" : "Log out"}
        </button>
      </section>
    </>
  );
}
