"use client";

import { useEffect, useState } from "react";

interface ProfileData {
  phone: string | null;
  full_name: string | null;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  address: string | null;
  kyc_tier: number;
  kyc_status: string;
}

// Preset avatars sourced online (DiceBear, single self-contained SVG per seed).
const AVATAR_SEEDS = ["Koala", "Nala", "Milo", "Zara", "Bandit", "Sasha", "Leo", "Pepper"];
function avatarUrlFor(seed: string): string {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;
}

export function AccountClient() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
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
        setUsername(d.username ?? "");
        setAvatarUrl(d.avatar_url ?? null);
        setDob(d.date_of_birth ? d.date_of_birth.slice(0, 10) : "");
        setAddress(d.address ?? "");
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
      body: JSON.stringify({
        fullName: fullName.trim(),
        email: email.trim() || null,
        username: username.trim() || null,
        avatarUrl,
        dob: dob || null,
        address: address.trim() || null,
      }),
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

  const currentAvatar = avatarUrl ?? avatarUrlFor(username || fullName || "Konek");

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-5 py-6">
      <section>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo/40">Avatar</p>
        <div className="konek-card-shadow rounded-2xl bg-white px-5 py-5">
          <div className="mb-4 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentAvatar}
              alt="Your avatar"
              width={56}
              height={56}
              className="h-14 w-14 rounded-full bg-indigo/5"
            />
            <p className="text-xs text-indigo/55">Pick an avatar for your profile.</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {AVATAR_SEEDS.map((seed) => {
              const url = avatarUrlFor(seed);
              const active = avatarUrl === url;
              return (
                <button
                  key={seed}
                  type="button"
                  onClick={() => setAvatarUrl(url)}
                  className={`rounded-full p-0.5 transition ${active ? "ring-2 ring-konek-green" : "ring-1 ring-indigo/10"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={seed} width={40} height={40} className="h-10 w-10 rounded-full" />
                </button>
              );
            })}
          </div>
        </div>
      </section>

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
            <label className="mb-1 block text-xs font-semibold text-indigo/50">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
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
            <label className="mb-1 block text-xs font-semibold text-indigo/50">Date of birth</label>
            <input
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-xl border border-indigo/20 px-4 py-2.5 text-sm text-indigo"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-indigo/50">Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Home address"
              rows={2}
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
        <p className="mt-2 px-1 text-[11px] text-indigo/40">
          Your date of birth and address are encrypted and used only for verification and compliance.
        </p>
      </section>
    </div>
  );
}
