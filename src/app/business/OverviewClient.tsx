"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BusinessWallet } from "./BusinessWallet";
import { BusinessShell, BizIcons } from "@/components/BusinessShell";

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
  created_at: string;
}

interface Reports {
  monthMinor: number;
  byService: { service_type: string; delivered: string; failed: string }[];
}

const BUSINESS_TYPES = [
  { id: "sme", label: "SME" },
  { id: "hr_bulk", label: "HR / bulk staff" },
  { id: "reward_platform", label: "Rewards platform" },
  { id: "travel_corporate", label: "Corporate travel" },
  { id: "white_label", label: "White label" },
];

function naira(minor: number | string) {
  return `₦${(Number(minor) / 100).toLocaleString()}`;
}

function KpiCard({ label, value, Icon }: { label: string; value: string; Icon: (p: { className?: string }) => JSX.Element }) {
  return (
    <div className="konek-card-shadow rounded-2xl bg-white p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo/10">
        <Icon className="h-[18px] w-[18px] text-indigo" />
      </div>
      <p className="font-heading text-2xl font-bold text-indigo">{value}</p>
      <p className="mt-1 text-sm text-text-secondary">{label}</p>
    </div>
  );
}

export function OverviewClient() {
  const [business, setBusiness] = useState<Business | null | undefined>(undefined);
  const [role, setRole] = useState<string | null>(null);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [recurringCount, setRecurringCount] = useState(0);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [reports, setReports] = useState<Reports | null>(null);

  const [legalName, setLegalName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [businessType, setBusinessType] = useState("sme");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/business/me")
      .then((res) => res.json())
      .then((data) => {
        setBusiness(data.business);
        setRole(data.role);
      });
    fetch("/api/business/employees")
      .then((res) => res.json())
      .then((data) => setEmployeeCount((data.employees ?? []).length));
    fetch("/api/business/recurring-distributions")
      .then((res) => res.json())
      .then((data) => setRecurringCount((data.schedules ?? []).length));
    fetch("/api/business/bulk-batches")
      .then((res) => res.json())
      .then((data) => setBatches(data.batches ?? []));
    fetch("/api/business/reports")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setReports(data));
  }

  useEffect(load, []);

  async function apply() {
    if (!legalName.trim()) {
      setError("Company name is required");
      return;
    }
    if (!regNumber.trim()) {
      setError("CAC registration number is required");
      return;
    }
    setApplying(true);
    setError(null);
    const res = await fetch("/api/business/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legalName, regNumber, businessType }),
    });
    setApplying(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }
    load();
  }

  if (business === undefined) return <main className="min-h-screen bg-ivory" />;

  if (!business) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ivory px-5">
        <div className="konek-card-shadow w-full max-w-md rounded-2xl bg-white p-6">
          <p className="mb-1 font-heading text-lg font-bold text-indigo">Set up your business</p>
          <p className="mb-5 text-sm text-text-secondary">
            Apply for a business account to manage workforce connectivity — airtime, data and benefits
            for your team, all from one place.
          </p>
          <label className="mb-2 block text-sm text-text-secondary">Company name</label>
          <input
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder="As registered with CAC"
            className="mb-4 w-full rounded-xl border border-border-soft px-4 py-2.5 text-sm"
          />
          <label className="mb-2 block text-sm text-text-secondary">CAC registration number</label>
          <input
            value={regNumber}
            onChange={(e) => setRegNumber(e.target.value)}
            placeholder="e.g. RC1234567"
            className="mb-4 w-full rounded-xl border border-border-soft px-4 py-2.5 text-sm"
          />
          <label className="mb-2 block text-sm text-text-secondary">Business type</label>
          <select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className="mb-4 w-full rounded-xl border border-border-soft px-4 py-2.5 text-sm"
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
            className="rounded-xl bg-indigo px-6 py-3 font-semibold text-white disabled:opacity-50"
          >
            {applying ? "Applying…" : "Apply"}
          </button>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      </main>
    );
  }

  const deliveredTotal = reports?.byService.reduce((s, r) => s + Number(r.delivered), 0) ?? 0;
  const failedTotal = reports?.byService.reduce((s, r) => s + Number(r.failed), 0) ?? 0;
  const successRate = deliveredTotal + failedTotal > 0 ? (deliveredTotal / (deliveredTotal + failedTotal)) * 100 : 100;

  return (
    <BusinessShell businessName={business.legal_name}>
      <div className="mx-auto max-w-6xl">
        <p className="text-sm text-text-secondary">Welcome back,</p>
        <h1 className="font-heading text-2xl font-bold text-indigo">{business.legal_name}</h1>
        <p className="mt-1 text-sm text-text-secondary">Manage your workforce connectivity from one place.</p>

        {business.kyb_status !== "verified" && (
          <div className="mt-5 rounded-2xl border border-gold/40 bg-gold/10 px-5 py-3.5 text-sm text-indigo">
            Distributions unlock once an admin verifies your KYB status. You can still build your employee
            directory in the meantime.
          </div>
        )}

        <BusinessWallet />

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Employees" value={employeeCount.toLocaleString()} Icon={BizIcons.Employees} />
          <KpiCard label="This Month Distributed" value={naira(reports?.monthMinor ?? 0)} Icon={BizIcons.Distributions} />
          <KpiCard label="Recurring Benefits" value={recurringCount.toLocaleString()} Icon={BizIcons.Recurring} />
          <KpiCard label="Delivery Success" value={`${successRate.toFixed(1)}%`} Icon={BizIcons.Reports} />
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="font-heading text-base font-bold text-indigo">Recent Activity</h2>
          <Link href="/business/distributions" className="text-sm font-semibold text-indigo hover:underline">
            View all →
          </Link>
        </div>
        <div className="konek-card-shadow mt-3 divide-y divide-border-soft rounded-2xl bg-white">
          {batches.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-text-secondary">
              No distributions yet. Create your first employee benefit to get started.
            </p>
          )}
          {batches.slice(0, 5).map((b) => (
            <div key={b.id} className="flex items-center gap-3 px-5 py-4">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  b.status === "completed" ? "bg-konek-green/15 text-konek-green" : "bg-gold/15 text-gold"
                }`}
              >
                {b.status === "completed" ? "✓" : "…"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-indigo">{b.purpose}</p>
                <p className="text-xs text-text-secondary">{b.total_items} Employees</p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-indigo">{naira(b.total_amount_minor)}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/business/distributions"
            className="konek-card-shadow konek-tile rounded-2xl bg-indigo px-5 py-4 text-white"
          >
            <p className="font-heading text-sm font-bold">Create Employee Benefit</p>
            <p className="mt-1 text-xs text-white/70">Airtime, data or eSIM for your team, right now.</p>
          </Link>
          <Link
            href="/business/employees"
            className="konek-card-shadow konek-tile rounded-2xl border border-border-soft bg-white px-5 py-4"
          >
            <p className="font-heading text-sm font-bold text-indigo">Manage Employees</p>
            <p className="mt-1 text-xs text-text-secondary">
              {role === "owner" || role === "admin" ? "Import, add or export your directory." : "View your team's directory."}
            </p>
          </Link>
          <Link
            href="/business/cards"
            className="konek-card-shadow konek-tile rounded-2xl border border-border-soft bg-white px-5 py-4"
          >
            <p className="font-heading text-sm font-bold text-indigo">Business cards</p>
            <p className="mt-1 text-xs text-text-secondary">Issue virtual cards for ops, ads and subscriptions.</p>
          </Link>
          <Link
            href="/business/vendors"
            className="konek-card-shadow konek-tile rounded-2xl border border-border-soft bg-white px-5 py-4"
          >
            <p className="font-heading text-sm font-bold text-indigo">Vendor transfers</p>
            <p className="mt-1 text-xs text-text-secondary">Save vendors and pay them from the business wallet.</p>
          </Link>
        </div>
      </div>
    </BusinessShell>
  );
}
