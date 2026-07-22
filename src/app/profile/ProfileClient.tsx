"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

// Emoji-card menu (the old Settings design), now the single account hub.
const CARDS = [
  { title: "Account information", description: "Personal details, username, avatar and address", href: "/profile/account", icon: "👤" },
  { title: "Verification", description: "Verify your identity to unlock accounts and cards", href: "/profile/verification", icon: "✅" },
  { title: "Privacy and security", description: "PIN, password, biometrics and sessions", href: "/settings", icon: "🔐" },
  { title: "Preferences", description: "Notifications and appearance settings", href: "/settings/preferences", icon: "⚙️" },
  { title: "Connected accounts", description: "Manage your cards and linked services", href: "/settings/connected-accounts", icon: "🔗" },
  { title: "Get help", description: "Contact support and resolve your issues", href: "/support", icon: "💬" },
  { title: "About Konek", description: "FAQs, terms and conditions, and contact", href: "/profile/about", icon: "ℹ️" },
];

function SettingCard({ title, description, href, icon }: { title: string; description: string; href: string; icon: string }) {
  return (
    <Link href={href} className="konek-tile flex items-center gap-4 rounded-2xl border border-indigo/10 bg-white p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo/10 text-xl">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-indigo">{title}</p>
        <p className="truncate text-sm text-indigo/60">{description}</p>
      </div>
    </Link>
  );
}

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
    <div className="mx-auto max-w-lg px-5 py-6">
      {/* ---------- Account header ---------- */}
      <Link href="/profile/account" className="konek-tile mb-4 block rounded-3xl bg-indigo p-6 text-white">
        <div className="flex items-center gap-4">
          {profile ? (
            <Avatar
              value={profile.avatar_url}
              name={profile.full_name || profile.email || profile.phone}
              size={56}
              className="ring-2 ring-white/25"
            />
          ) : (
            <span className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-white/20" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-lg font-bold">{profile?.full_name || "Your Account"}</p>
            <p className="truncate text-sm text-white/70">
              {profile?.username
                ? `@${profile.username}`
                : profile?.email || profile?.phone || "Manage your profile, security and preferences"}
            </p>
          </div>
        </div>
      </Link>

      {/* ---------- Completeness nudge ---------- */}
      {c && (
        <Link href={c.nextHref} className="konek-tile mb-4 block rounded-2xl border border-indigo/10 bg-white px-5 py-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-indigo">Profile {c.pct}% complete</p>
            <span className="text-xs font-semibold text-konek-green">{c.nextLabel} →</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-indigo/10">
            <div className="h-full rounded-full bg-konek-green transition-all" style={{ width: `${c.pct}%` }} />
          </div>
        </Link>
      )}

      {/* ---------- Menu ---------- */}
      <div className="space-y-3">
        {CARDS.map((card) => (
          <SettingCard key={card.href} {...card} />
        ))}
      </div>

      {/* ---------- Security note ---------- */}
      <div className="mt-6 rounded-3xl border border-indigo/10 bg-white p-5">
        <h2 className="font-bold text-indigo">Security protection</h2>
        <p className="mt-2 text-sm text-indigo/60">
          Konek protects your account with identity verification, transaction PINs, fraud monitoring and
          secure sessions.
        </p>
      </div>

      {/* ---------- Log out ---------- */}
      <button
        onClick={logout}
        disabled={loggingOut}
        className="konek-card-shadow mt-6 w-full rounded-2xl bg-white px-4 py-3.5 text-center text-sm font-semibold text-red-600 disabled:opacity-50"
      >
        {loggingOut ? "Logging out…" : "Log out"}
      </button>
    </div>
  );
}
