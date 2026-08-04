"use client";

import { useEffect, useState } from "react";
import { BusinessShell } from "@/components/BusinessShell";

interface Reports {
  monthMinor: number;
  allTimeMinor: number;
  batchCount: number;
  byPurpose: { purpose: string; amount_minor: string; items: string }[];
  byService: { service_type: string; delivered: string; failed: string; amount_minor: string }[];
}

function naira(minor: number | string) {
  return `₦${(Number(minor) / 100).toLocaleString()}`;
}

export function ReportsClient() {
  const [businessName, setBusinessName] = useState<string | undefined>();
  const [reports, setReports] = useState<Reports | null>(null);

  useEffect(() => {
    fetch("/api/business/me")
      .then((r) => r.json())
      .then((d) => setBusinessName(d.business?.legal_name));
    fetch("/api/business/reports")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setReports(d));
  }, []);

  const deliveredTotal = reports?.byService.reduce((s, r) => s + Number(r.delivered), 0) ?? 0;
  const failedTotal = reports?.byService.reduce((s, r) => s + Number(r.failed), 0) ?? 0;
  const successRate = deliveredTotal + failedTotal > 0 ? (deliveredTotal / (deliveredTotal + failedTotal)) * 100 : 100;

  return (
    <BusinessShell businessName={businessName}>
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-indigo">Reports</h1>
            <p className="mt-1 text-sm text-text-secondary">Connectivity spend across every distribution.</p>
          </div>
          <a href="/api/business/reports/export" className="rounded-lg border border-border-soft bg-white px-4 py-2 text-sm font-semibold text-indigo hover:bg-hover-tint">
            Export CSV
          </a>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="konek-card-shadow rounded-2xl bg-white p-5">
            <p className="font-heading text-xl font-bold text-indigo">{naira(reports?.monthMinor ?? 0)}</p>
            <p className="mt-1 text-sm text-text-secondary">This month</p>
          </div>
          <div className="konek-card-shadow rounded-2xl bg-white p-5">
            <p className="font-heading text-xl font-bold text-indigo">{naira(reports?.allTimeMinor ?? 0)}</p>
            <p className="mt-1 text-sm text-text-secondary">All time · {reports?.batchCount ?? 0} distributions</p>
          </div>
          <div className="konek-card-shadow rounded-2xl bg-white p-5">
            <p className="font-heading text-xl font-bold text-indigo">{successRate.toFixed(1)}%</p>
            <p className="mt-1 text-sm text-text-secondary">Distribution success</p>
          </div>
        </div>

        <h2 className="mt-8 font-heading text-base font-bold text-indigo">Connectivity spend by service</h2>
        <div className="konek-card-shadow mt-3 divide-y divide-border-soft rounded-2xl bg-white">
          {(reports?.byService.length ?? 0) === 0 && (
            <p className="px-5 py-8 text-center text-sm text-text-secondary">No spend recorded yet.</p>
          )}
          {reports?.byService.map((s) => (
            <div key={s.service_type} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm font-medium capitalize text-indigo">{s.service_type ?? "Unknown"}</span>
              <span className="text-sm text-text-secondary">
                {s.delivered} delivered{Number(s.failed) > 0 ? ` · ${s.failed} failed` : ""} · {naira(s.amount_minor)}
              </span>
            </div>
          ))}
        </div>

        <h2 className="mt-8 font-heading text-base font-bold text-indigo">By distribution name</h2>
        <div className="konek-card-shadow mt-3 divide-y divide-border-soft rounded-2xl bg-white">
          {(reports?.byPurpose.length ?? 0) === 0 && (
            <p className="px-5 py-8 text-center text-sm text-text-secondary">No distributions yet.</p>
          )}
          {reports?.byPurpose.map((p) => (
            <div key={p.purpose} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm font-medium text-indigo">{p.purpose}</span>
              <span className="text-sm text-text-secondary">
                {p.items} employees · {naira(p.amount_minor)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </BusinessShell>
  );
}
