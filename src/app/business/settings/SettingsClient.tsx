"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BusinessShell } from "@/components/BusinessShell";
import { AVATAR_PRESETS, parseAvatar, emojiValue } from "@/lib/avatars";

interface Business {
  id: string;
  legal_name: string;
  business_type: string;
  kyb_status: string;
  notify_failed_distributions: boolean;
  notify_low_balance: boolean;
  low_balance_threshold_minor: string;
  brand_emoji: string | null;
}

interface TeamMember {
  id: string;
  phone: string;
  full_name: string | null;
  role: string;
}

const TEAM_ROLES = ["admin", "finance", "hr", "marketing", "viewer"];

const KYB_LABEL: Record<string, { label: string; className: string }> = {
  verified: { label: "Verified", className: "bg-konek-green/15 text-konek-green" },
  pending: { label: "Pending review", className: "bg-gold/15 text-gold" },
  rejected: { label: "Needs attention", className: "bg-red-100 text-red-600" },
};

function ComingSoonRow({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-3.5 opacity-70">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-indigo">{label}</span>
        <span className="block text-xs text-text-secondary">{sub}</span>
      </span>
      <span className="shrink-0 rounded-full bg-hover-tint px-2.5 py-1 text-[11px] font-semibold text-indigo/50">Coming soon</span>
    </div>
  );
}

function LinkRow({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <Link href={href} className="konek-tile flex items-center justify-between rounded-2xl bg-white px-5 py-3.5">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-indigo">{label}</span>
        <span className="block text-xs text-text-secondary">{sub}</span>
      </span>
      <span className="shrink-0 text-indigo/30">→</span>
    </Link>
  );
}

export function SettingsClient() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [teamMsg, setTeamMsg] = useState<string | null>(null);
  const [threshold, setThreshold] = useState("");
  const [prefMsg, setPrefMsg] = useState<string | null>(null);

  function load() {
    fetch("/api/business/me")
      .then((r) => r.json())
      .then((d) => {
        setBusiness(d.business);
        setRole(d.role);
        if (d.business?.low_balance_threshold_minor != null) {
          setThreshold((Number(d.business.low_balance_threshold_minor) / 100).toString());
        }
      });
    fetch("/api/business/team")
      .then((r) => r.json())
      .then((d) => setTeam(d.team ?? []));
  }
  useEffect(load, []);

  const canManageTeam = role === "owner" || role === "admin";

  async function invite() {
    setTeamMsg(null);
    const res = await fetch("/api/business/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: invitePhone, role: inviteRole }),
    });
    const data = await res.json().catch(() => ({}));
    setTeamMsg(res.ok ? "Member added" : data.error ?? "Failed");
    if (res.ok) {
      setInvitePhone("");
      load();
    }
  }

  async function remove(memberId: string) {
    await fetch(`/api/business/team/${memberId}`, { method: "DELETE" });
    load();
  }

  async function changeRole(memberId: string, newRole: string) {
    await fetch(`/api/business/team/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    load();
  }

  async function updatePrefs(patch: Record<string, unknown>) {
    setPrefMsg(null);
    const res = await fetch("/api/business/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setPrefMsg(res.ok ? "Saved" : "Could not save");
    load();
  }

  const kyb = business ? KYB_LABEL[business.kyb_status] ?? { label: business.kyb_status, className: "bg-hover-tint text-indigo/60" } : null;
  const brand = parseAvatar(business?.brand_emoji ? emojiValue(business.brand_emoji) : null);

  return (
    <BusinessShell businessName={business?.legal_name}>
      <div className="mx-auto max-w-4xl">
        <h1 className="font-heading text-2xl font-bold text-indigo">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">Company details, verification, team, notifications and branding.</p>

        <section className="mt-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">Company</p>
          <div className="konek-card-shadow flex items-center gap-4 rounded-2xl bg-white p-5">
            {brand && (
              <span
                style={{ background: brand.bg }}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl"
              >
                {brand.emoji}
              </span>
            )}
            <div className="flex-1">
              <p className="font-heading text-base font-bold text-indigo">{business?.legal_name}</p>
              <p className="mt-1 text-sm capitalize text-text-secondary">{business?.business_type?.replace("_", " ")}</p>
            </div>
            {kyb && <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${kyb.className}`}>KYB: {kyb.label}</span>}
          </div>
        </section>

        <section className="mt-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">Team &amp; roles</p>
          <div className="konek-card-shadow rounded-2xl bg-white p-5">
            <div className="mb-4 flex flex-col gap-2">
              {team.length === 0 && <p className="text-sm text-text-secondary">Just you so far.</p>}
              {team.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-border-soft px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-indigo">{m.full_name ?? m.phone}</p>
                    <p className="truncate text-xs text-text-secondary">{m.phone}</p>
                  </div>
                  {canManageTeam ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <select
                        value={m.role}
                        onChange={(e) => changeRole(m.id, e.target.value)}
                        className="rounded-lg border border-border-soft px-2 py-1.5 text-xs capitalize"
                      >
                        {TEAM_ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <button onClick={() => remove(m.id)} className="text-xs font-semibold text-red-600 hover:underline">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <span className="shrink-0 text-xs capitalize text-text-secondary">{m.role}</span>
                  )}
                </div>
              ))}
            </div>
            {canManageTeam && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="+2348012345678"
                  className="w-full rounded-xl border border-border-soft px-3 py-2.5 text-sm sm:flex-1"
                />
                <div className="flex gap-2">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="flex-1 rounded-xl border border-border-soft px-2 py-2.5 text-sm capitalize sm:flex-none"
                  >
                    {TEAM_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button onClick={invite} className="shrink-0 rounded-xl bg-indigo px-4 text-sm font-semibold text-white">
                    Add
                  </button>
                </div>
              </div>
            )}
            {teamMsg && <p className="mt-2 text-sm text-text-secondary">{teamMsg}</p>}
          </div>
        </section>

        {canManageTeam && (
          <section className="mt-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">Notifications</p>
            <div className="konek-card-shadow flex flex-col gap-4 rounded-2xl bg-white p-5">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm text-indigo">Alert me when a distribution has failures</span>
                <input
                  type="checkbox"
                  checked={business?.notify_failed_distributions ?? true}
                  onChange={(e) => updatePrefs({ notifyFailedDistributions: e.target.checked })}
                  className="h-5 w-5 accent-konek-green"
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm text-indigo">Alert me when the business balance is low</span>
                <input
                  type="checkbox"
                  checked={business?.notify_low_balance ?? true}
                  onChange={(e) => updatePrefs({ notifyLowBalance: e.target.checked })}
                  className="h-5 w-5 accent-konek-green"
                />
              </label>
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm text-indigo">Low balance threshold (₦)</span>
                <input
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value.replace(/[^\d.]/g, ""))}
                  onBlur={() => threshold && updatePrefs({ lowBalanceThresholdMinor: Math.round(Number(threshold) * 100) })}
                  className="w-28 rounded-lg border border-border-soft px-2 py-1.5 text-sm"
                />
              </div>
              {prefMsg && <p className="text-xs text-text-secondary">{prefMsg}</p>}
            </div>
          </section>
        )}

        {canManageTeam && (
          <section className="mt-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">Branding</p>
            <div className="konek-card-shadow rounded-2xl bg-white p-5">
              <p className="mb-3 text-sm text-text-secondary">Pick a mark for your business — shown across the hub.</p>
              <div className="flex flex-wrap gap-2">
                {AVATAR_PRESETS.map((emoji) => {
                  const preview = parseAvatar(emojiValue(emoji));
                  const active = business?.brand_emoji === emoji;
                  return (
                    <button
                      key={emoji}
                      onClick={() => updatePrefs({ brandEmoji: emoji })}
                      style={{ background: preview?.bg }}
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${active ? "ring-2 ring-indigo ring-offset-2" : ""}`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <section className="mt-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">More</p>
          <div className="flex flex-col gap-2.5">
            <LinkRow href="/business/billing" label="Billing" sub="Fee history — Konek has no subscription, just per-action fees" />
            <LinkRow href="/business/security" label="Security" sub="Activity log for your organization (SSO coming soon)" />
            <ComingSoonRow label="Integrations" sub="Connect your HRIS or payroll system — needs a partner decision" />
          </div>
        </section>
      </div>
    </BusinessShell>
  );
}
