"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PinPad } from "@/components/PinPad";
import { IconShield, IconChevronRight } from "@/components/icons";

interface ProfileData {
  phone: string | null;
  full_name: string | null;
  email: string | null;
  kyc_tier: number;
  kyc_status: string;
}

const KYC_LABEL: Record<string, string> = {
  none: "Not started",
  pending: "Pending review",
  verified: "Verified",
  rejected: "Needs attention",
};

function CloseAccountCard() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  async function submit(finalPin: string) {
    setClosing(true);
    setError(null);
    const res = await fetch("/api/account/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: finalPin }),
    });
    setClosing(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Failed to close account");
      setPin("");
      return;
    }
    router.push("/login");
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-center text-sm font-semibold text-red-600"
      >
        Close account
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6">
      <p className="mb-1 text-center text-sm font-semibold text-red-700">This closes your account for good</p>
      <p className="mb-4 text-center text-xs text-red-600/80">
        Your wallet must be at ₦0 / $0 first. Enter your PIN to confirm.
      </p>
      <PinPad value={pin} onChange={setPin} onComplete={submit} />
      {error && <p className="mt-3 text-center text-xs text-red-600">{error}</p>}
      {closing && <p className="mt-3 text-center text-xs text-red-600/70">Closing…</p>}
      <button onClick={() => setConfirming(false)} className="mt-4 w-full text-center text-xs text-indigo/50">
        Cancel
      </button>
    </div>
  );
}

export function AccountClient() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
    setSaved(false);
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
    setSaved(true);
    load();
  }

  if (!profile) {
    return <p className="px-5 pt-8 text-sm text-indigo/50">Loading…</p>;
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-5 py-6">
      <section>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo/40">Personal details</p>
        <div className="konek-card-shadow flex flex-col gap-2.5 rounded-2xl bg-white px-5 py-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-indigo/50">Full name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-xl border border-indigo/20 px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-indigo/50">Email address</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              type="email"
              className="w-full rounded-xl border border-indigo/20 px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-indigo/50">Phone</label>
            <p className="rounded-xl bg-hover-tint px-4 py-2.5 text-sm text-indigo/60">
              {profile.phone || "No phone on file"}
            </p>
          </div>
          {message && <p className="text-xs text-red-600">{message}</p>}
          {saved && <p className="text-xs font-semibold text-konek-green">Saved ✓</p>}
          <button
            onClick={saveProfile}
            disabled={saving}
            className="mt-1 rounded-xl bg-indigo px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>

      <section>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo/40">Verification</p>
        <Link
          href="/kyc"
          className="konek-card-shadow konek-tile flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo/10">
            <IconShield className="h-5 w-5 text-indigo" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-indigo">Identity verification</span>
            <span className="block text-xs text-indigo/55">{KYC_LABEL[profile.kyc_status] ?? profile.kyc_status}</span>
          </span>
          <IconChevronRight className="h-4 w-4 shrink-0 text-indigo/30" />
        </Link>
      </section>

      <section>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-red-600/60">Danger zone</p>
        <CloseAccountCard />
      </section>
    </div>
  );
}
