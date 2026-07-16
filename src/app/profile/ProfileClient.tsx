"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconProfile,
  IconShield,
  IconBolt,
  IconBell,
  IconWallet,
  IconGift,
  IconChevronRight,
} from "@/components/icons";

interface ProfileData {
  phone: string | null;
  full_name: string | null;
  email: string | null;
  country_code: string;
  kyc_tier: number;
  kyc_status: string;
  created_at: string;
}

const KYC_LABEL: Record<string, string> = {
  none: "Not started",
  pending: "Pending review",
  verified: "Verified",
  rejected: "Needs attention",
};

function NavRow({ label, sub, Icon, href }: { label: string; sub?: string; Icon: typeof IconProfile; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 konek-card-shadow konek-tile">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo/10">
        <Icon className="h-5 w-5 text-indigo" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-indigo">{label}</span>
        {sub && <span className="block truncate text-xs text-indigo/55">{sub}</span>}
      </span>
      <IconChevronRight className="h-4 w-4 shrink-0 text-indigo/30" />
    </Link>
  );
}

export function ProfileClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  function load() {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d: ProfileData) => {
        setProfile(d);
        setFullName(d.full_name ?? "");
        setEmail(d.email ?? "");
      });
  }
  useEffect(load, []);

  async function saveProfile() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: fullName.trim(), email: email.trim() || null }),
    });
    setSaving(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(body.error ?? "Failed to save");
      return;
    }
    setEditing(false);
    load();
  }

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (!profile) {
    return <p className="px-5 pt-8 text-sm text-indigo/50">Loading…</p>;
  }

  return (
    <>
      {/* ---------- Personal Info ---------- */}
      <section className="px-5">
        <div className="rounded-2xl bg-white px-5 py-5 konek-card-shadow">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo/10 font-heading text-lg font-bold text-indigo">
              {(profile.full_name || profile.phone || "?").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-base font-bold text-indigo">
                {profile.full_name || "Add your name"}
              </p>
              <p className="text-sm text-indigo/55">{profile.phone || "No phone on file"}</p>
            </div>
            {!editing && (
              <button onClick={() => setEditing(true)} className="shrink-0 text-xs font-semibold text-indigo underline">
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <div className="flex flex-col gap-2.5">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-xl border border-indigo/20 px-4 py-2.5 text-sm"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                type="email"
                className="w-full rounded-xl border border-indigo/20 px-4 py-2.5 text-sm"
              />
              {message && <p className="text-xs text-red-600">{message}</p>}
              <div className="flex gap-2">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="rounded-xl bg-indigo px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setMessage(null);
                  }}
                  className="text-sm text-indigo/50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-indigo/60">{profile.email || "No email on file"}</p>
          )}
        </div>
      </section>

      {/* ---------- Nav rows ---------- */}
      <section className="mt-6 flex flex-col gap-2.5 px-5">
        <NavRow label="Verification" sub={KYC_LABEL[profile.kyc_status] ?? profile.kyc_status} Icon={IconShield} href="/kyc" />
        <NavRow label="Security" sub="Transaction PIN & account settings" Icon={IconBolt} href="/settings" />
        <NavRow label="Notifications" sub="Push, SMS & WhatsApp preferences" Icon={IconBell} href="/notifications" />
        <NavRow label="Payment Methods" sub="Virtual cards" Icon={IconWallet} href="/cards" />
        <NavRow label="Support" sub="FAQs & help center" Icon={IconShield} href="/support" />
        <NavRow label="Referral" sub="Earn credit for every friend" Icon={IconGift} href="/rewards" />
      </section>

      {/* ---------- Legal ---------- */}
      <section className="mt-6 px-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo/40">Legal</p>
        <div className="flex flex-col gap-2.5">
          <NavRow label="Terms of Service" Icon={IconShield} href="/terms" />
          <NavRow label="Privacy Policy" Icon={IconShield} href="/privacy" />
        </div>
      </section>

      {/* ---------- Logout ---------- */}
      <section className="mt-6 px-5">
        <button
          onClick={logout}
          disabled={loggingOut}
          className="w-full rounded-2xl bg-white px-4 py-3.5 text-center text-sm font-semibold text-red-600 konek-card-shadow disabled:opacity-50"
        >
          {loggingOut ? "Logging out…" : "Log out"}
        </button>
      </section>
    </>
  );
}
