"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BusinessShell } from "@/components/BusinessShell";

interface Batch {
  id: string;
  purpose: string;
  total_items: number;
  total_amount_minor: string;
  status: string;
  created_at: string;
}

function naira(minor: number | string) {
  return `₦${(Number(minor) / 100).toLocaleString()}`;
}

export function DistributionsClient() {
  const [businessName, setBusinessName] = useState<string | undefined>();
  const [kybVerified, setKybVerified] = useState(false);
  const [mayDistribute, setMayDistribute] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [campaignName, setCampaignName] = useState("Monthly Internet Allowance");
  const [csv, setCsv] = useState("mtn,08011112222,1000\nglo,08033334444,500");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);

  function load() {
    fetch("/api/business/me")
      .then((r) => r.json())
      .then((d) => {
        setBusinessName(d.business?.legal_name);
        setKybVerified(d.business?.kyb_status === "verified");
        setRole(d.role);
        setMayDistribute(Boolean(d.canDistribute));
      });
    fetch("/api/business/bulk-batches")
      .then((r) => r.json())
      .then((d) => setBatches(d.batches ?? []));
  }
  useEffect(load, []);

  async function send() {
    setUploading(true);
    setUploadResult(null);
    const items = csv
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(",").map((s) => s.trim());
        const hasService = parts[0] === "airtime" || parts[0] === "data";
        const [serviceType, network, phone, amountNaira] = hasService ? parts : ["airtime", ...parts];
        return { serviceType, network, phone, amountMinor: Math.round(Number(amountNaira) * 100) };
      });

    const res = await fetch("/api/business/bulk-batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: campaignName, items }),
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

  return (
    <BusinessShell businessName={businessName}>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-heading text-2xl font-bold text-indigo">Distributions</h1>
        <p className="mt-1 text-sm text-text-secondary">Send airtime and data benefits to your employees.</p>

        {!kybVerified ? (
          <div className="konek-card-shadow mt-6 rounded-2xl bg-white p-6 text-center text-sm text-text-secondary">
            Distributions unlock once an admin verifies your KYB status.
          </div>
        ) : !mayDistribute ? (
          <div className="konek-card-shadow mt-6 rounded-2xl bg-white p-6 text-center text-sm text-text-secondary">
            Your role ({role}) can view distributions but not send them.
          </div>
        ) : (
          <div className="konek-card-shadow mt-6 rounded-2xl bg-white p-6">
            <p className="mb-4 font-heading text-base font-bold text-indigo">Create Employee Benefit</p>

            <label className="mb-2 block text-sm text-text-secondary">Distribution Name</label>
            <input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="mb-4 w-full rounded-xl border border-border-soft px-4 py-2.5 text-sm"
            />

            <label className="mb-2 block text-sm text-text-secondary">
              Recipients — one per line: network,phone,amount₦ (or data,network,phone,amount₦)
            </label>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={5}
              className="mb-4 w-full rounded-xl border border-border-soft px-4 py-2.5 text-sm font-mono"
            />
            <p className="mb-4 text-xs text-text-secondary">
              Prefer picking from your directory instead of typing numbers?{" "}
              <Link href="/business/employees" className="font-semibold text-indigo hover:underline">
                Manage employees
              </Link>
              .
            </p>

            <button
              onClick={send}
              disabled={uploading}
              className="rounded-xl bg-indigo px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              {uploading ? "Sending…" : "Send Benefit"}
            </button>
            {uploadResult && <p className="mt-3 text-sm text-text-secondary">{uploadResult}</p>}
            <Link href="/business/recurring" className="mt-4 inline-block text-sm font-semibold text-indigo hover:underline">
              Make this recurring →
            </Link>
          </div>
        )}

        <h2 className="mt-8 font-heading text-base font-bold text-indigo">History</h2>
        <div className="konek-card-shadow mt-3 divide-y divide-border-soft rounded-2xl bg-white">
          {batches.length === 0 && <p className="px-5 py-8 text-center text-sm text-text-secondary">No distributions yet.</p>}
          {batches.map((b) => (
            <div key={b.id} className="flex items-center justify-between px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-indigo">{b.purpose}</p>
                <p className="text-xs text-text-secondary capitalize">
                  {b.total_items} employees · {b.status}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-indigo">{naira(b.total_amount_minor)}</p>
            </div>
          ))}
        </div>
      </div>
    </BusinessShell>
  );
}
