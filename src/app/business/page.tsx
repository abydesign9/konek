"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";

interface Business {
  id: string;
  legal_name: string;
  business_type: string;
  kyb_status: string;
}

interface Batch {
  id: string;
  purpose: string;
  total_items: number;
  total_amount_minor: string;
  status: string;
}

interface TeamMember {
  id: string;
  phone: string;
  full_name: string | null;
  role: string;
}

interface Reports {
  monthMinor: number;
  allTimeMinor: number;
  batchCount: number;
  byService: { service_type: string; delivered: string; failed: string; amount_minor: string }[];
}

const BUSINESS_TYPES = [
  { id: "sme", label: "SME" },
  { id: "hr_bulk", label: "HR / bulk staff" },
  { id: "reward_platform", label: "Rewards platform" },
  { id: "travel_corporate", label: "Corporate travel" },
  { id: "white_label", label: "White label" },
];

const TEAM_ROLES = ["admin", "finance", "hr", "marketing", "viewer"];

function naira(minor: number | string) {
  return `₦${(Number(minor) / 100).toLocaleString()}`;
}

export default function BusinessPage() {
  const [business, setBusiness] = useState<Business | null | undefined>(undefined);
  const [role, setRole] = useState<string | null>(null);
  const [mayDistribute, setMayDistribute] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [reports, setReports] = useState<Reports | null>(null);

  const [legalName, setLegalName] = useState("");
  const [businessType, setBusinessType] = useState("sme");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [purpose, setPurpose] = useState("staff_data");
  const [csv, setCsv] = useState("mtn,08011112222,1000\nglo,08033334444,500");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);

  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [teamMsg, setTeamMsg] = useState<string | null>(null);

  function load() {
    fetch("/api/business/me")
      .then((res) => res.json())
      .then((data) => {
        setBusiness(data.business);
        setRole(data.role);
        setMayDistribute(Boolean(data.canDistribute));
      });
    fetch("/api/business/bulk-batches")
      .then((res) => res.json())
      .then((data) => setBatches(data.batches ?? []));
    fetch("/api/business/team")
      .then((res) => res.json())
      .then((data) => setTeam(data.team ?? []));
    fetch("/api/business/reports")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setReports(data));
  }

  useEffect(load, []);

  async function apply() {
    if (!legalName.trim()) {
      setError("Legal name is required");
      return;
    }
    setApplying(true);
    setError(null);
    const res = await fetch("/api/business/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legalName, businessType }),
    });
    setApplying(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }
    load();
  }

  async function uploadBatch() {
    setUploading(true);
    setUploadResult(null);
    const items = csv
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // "network,phone,amount₦" (airtime) or "data,network,phone,amount₦"
        const parts = line.split(",").map((s) => s.trim());
        const hasService = parts[0] === "airtime" || parts[0] === "data";
        const [serviceType, network, phone, amountNaira] = hasService
          ? parts
          : ["airtime", ...parts];
        return { serviceType, network, phone, amountMinor: Math.round(Number(amountNaira) * 100) };
      });

    const res = await fetch("/api/business/bulk-batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose, items }),
    });
    setUploading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setUploadResult(`Error: ${data.error}`);
      return;
    }
    setUploadResult(`Delivered ${data.delivered}, failed ${data.failed}`);
    load();
  }

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

  const canManageTeam = role === "owner" || role === "admin";

  if (business === undefined) return <main className="min-h-screen bg-background" />;

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="Business account" backHref="/home" />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6">
      {!business && (
        <div className="rounded-2xl border border-indigo/10 bg-white p-5">
          <p className="text-sm text-indigo/70 mb-4">
            Apply for a business (KYB) account to run bulk distributions for staff, rewards, or
            corporate travel.
          </p>
          <label className="block text-sm text-indigo/60 mb-2">Legal name</label>
          <input
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            className="w-full rounded-xl border border-indigo/20 px-4 py-2.5 text-sm mb-4"
          />
          <label className="block text-sm text-indigo/60 mb-2">Business type</label>
          <select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className="w-full rounded-xl border border-indigo/20 px-4 py-2.5 text-sm mb-4"
          >
            {BUSINESS_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            onClick={apply}
            disabled={applying}
            className="rounded-xl bg-indigo text-white font-semibold px-6 py-3 disabled:opacity-50"
          >
            {applying ? "Applying…" : "Apply"}
          </button>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>
      )}

      {business && (
        <>
          <div className="rounded-2xl bg-indigo px-5 py-4 text-white mb-6">
            <p className="text-xs text-white/60 mb-1">{business.business_type}</p>
            <p className="font-heading text-lg font-bold">{business.legal_name}</p>
            <p className="text-xs text-white/70 mt-2 capitalize">
              KYB: {business.kyb_status} · Your role: {role}
            </p>
          </div>

          {/* Reports */}
          {reports && (
            <div className="rounded-2xl border border-indigo/10 bg-white p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-indigo">Spending reports</p>
                <a href="/api/business/reports/export" className="text-xs font-semibold text-konek-green hover:underline">
                  Export CSV
                </a>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-xl bg-indigo/5 px-3 py-2.5">
                  <p className="text-xs text-indigo/50">This month</p>
                  <p className="font-heading font-bold text-indigo">{naira(reports.monthMinor)}</p>
                </div>
                <div className="rounded-xl bg-indigo/5 px-3 py-2.5">
                  <p className="text-xs text-indigo/50">All time · {reports.batchCount} batches</p>
                  <p className="font-heading font-bold text-indigo">{naira(reports.allTimeMinor)}</p>
                </div>
              </div>
              {reports.byService.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {reports.byService.map((s) => (
                    <p key={s.service_type} className="text-xs text-indigo/60 flex justify-between">
                      <span className="capitalize">{s.service_type}</span>
                      <span>
                        {s.delivered} delivered{Number(s.failed) > 0 ? ` · ${s.failed} failed` : ""} ·{" "}
                        {naira(s.amount_minor)}
                      </span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Team */}
          <div className="rounded-2xl border border-indigo/10 bg-white p-5 mb-6">
            <p className="text-sm font-semibold text-indigo mb-3">Team</p>
            <div className="flex flex-col gap-2 mb-4">
              {team.length === 0 && <p className="text-sm text-indigo/50">Just you so far.</p>}
              {team.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-indigo/10 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-indigo truncate">{m.full_name ?? m.phone}</p>
                    <p className="text-xs text-indigo/50 truncate">
                      {m.phone} · {m.role}
                    </p>
                  </div>
                  {canManageTeam && (
                    <button onClick={() => remove(m.id)} className="text-xs text-red-600 underline shrink-0">
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            {canManageTeam && (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="+2348012345678"
                  className="w-full sm:flex-1 rounded-xl border border-indigo/20 px-3 py-2.5 text-sm"
                />
                <div className="flex gap-2">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="flex-1 sm:flex-none rounded-xl border border-indigo/20 px-2 py-2.5 text-sm"
                  >
                    {TEAM_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button onClick={invite} className="shrink-0 rounded-xl bg-indigo text-white text-sm font-semibold px-4">
                    Add
                  </button>
                </div>
              </div>
            )}
            {teamMsg && <p className="text-sm text-indigo/70 mt-2">{teamMsg}</p>}
          </div>

          {/* Distribution */}
          {business.kyb_status === "verified" ? (
            mayDistribute ? (
              <div className="rounded-2xl border border-indigo/10 bg-white p-5 mb-8">
                <p className="text-sm font-semibold text-indigo mb-3">Bulk distribution</p>
                <label className="block text-sm text-indigo/60 mb-2">Purpose</label>
                <input
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full rounded-xl border border-indigo/20 px-4 py-2.5 text-sm mb-4"
                />
                <label className="block text-sm text-indigo/60 mb-2">
                  Items — one per line: network,phone,amount₦ (or data,network,phone,amount₦)
                </label>
                <textarea
                  value={csv}
                  onChange={(e) => setCsv(e.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-indigo/20 px-4 py-2.5 text-sm font-mono mb-4"
                />
                <button
                  onClick={uploadBatch}
                  disabled={uploading}
                  className="rounded-xl bg-indigo text-white font-semibold px-6 py-3 disabled:opacity-50"
                >
                  {uploading ? "Processing…" : "Upload & process"}
                </button>
                {uploadResult && <p className="text-sm text-indigo/70 mt-3">{uploadResult}</p>}
              </div>
            ) : (
              <p className="text-sm text-indigo/60 mb-8">
                Your role ({role}) can view reports but not run distributions.
              </p>
            )
          ) : (
            <p className="text-sm text-indigo/60 mb-8">
              Bulk uploads unlock once an admin verifies your KYB status.
            </p>
          )}

          <p className="text-sm font-semibold text-indigo mb-3">Batches</p>
          <div className="flex flex-col gap-2 mb-8">
            {batches.map((b) => (
              <div key={b.id} className="rounded-xl border border-indigo/10 bg-white px-4 py-3">
                <p className="text-sm font-medium text-indigo">{b.purpose}</p>
                <p className="text-xs text-indigo/60">
                  {b.total_items} items · {naira(b.total_amount_minor)} · {b.status}
                </p>
              </div>
            ))}
            {batches.length === 0 && <p className="text-sm text-indigo/50">No batches yet.</p>}
          </div>
        </>
      )}
      </div>
    </main>
  );
}
