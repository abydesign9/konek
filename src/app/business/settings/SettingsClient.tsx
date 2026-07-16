"use client";

import { useEffect, useState } from "react";
import { BusinessShell } from "@/components/BusinessShell";

interface Business {
  id: string;
  legal_name: string;
  business_type: string;
  kyb_status: string;
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

export function SettingsClient() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [teamMsg, setTeamMsg] = useState<string | null>(null);

  function load() {
    fetch("/api/business/me")
      .then((r) => r.json())
      .then((d) => {
        setBusiness(d.business);
        setRole(d.role);
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

  const kyb = business ? KYB_LABEL[business.kyb_status] ?? { label: business.kyb_status, className: "bg-hover-tint text-indigo/60" } : null;

  return (
    <BusinessShell businessName={business?.legal_name}>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-heading text-2xl font-bold text-indigo">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">Company details, verification, team and what&apos;s coming next.</p>

        <section className="mt-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">Company</p>
          <div className="konek-card-shadow rounded-2xl bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-heading text-base font-bold text-indigo">{business?.legal_name}</p>
                <p className="mt-1 text-sm capitalize text-text-secondary">{business?.business_type?.replace("_", " ")}</p>
              </div>
              {kyb && <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${kyb.className}`}>KYB: {kyb.label}</span>}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">Team</p>
          <div className="konek-card-shadow rounded-2xl bg-white p-5">
            <div className="mb-4 flex flex-col gap-2">
              {team.length === 0 && <p className="text-sm text-text-secondary">Just you so far.</p>}
              {team.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-border-soft px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-indigo">{m.full_name ?? m.phone}</p>
                    <p className="truncate text-xs capitalize text-text-secondary">
                      {m.phone} · {m.role}
                    </p>
                  </div>
                  {canManageTeam && (
                    <button onClick={() => remove(m.id)} className="shrink-0 text-xs font-semibold text-red-600 hover:underline">
                      Remove
                    </button>
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

        <section className="mt-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">More</p>
          <div className="flex flex-col gap-2.5">
            <ComingSoonRow label="Billing" sub="Invoices and payment method for your business" />
            <ComingSoonRow label="Roles & permissions" sub="Fine-grained access beyond the built-in roles" />
            <ComingSoonRow label="Security" sub="SSO and audit log for your organization" />
            <ComingSoonRow label="Notifications" sub="Alerts for failed distributions and low balance" />
            <ComingSoonRow label="Branding" sub="Your logo on employee-facing receipts" />
            <ComingSoonRow label="Integrations" sub="Connect your HRIS or payroll system" />
          </div>
        </section>
      </div>
    </BusinessShell>
  );
}
