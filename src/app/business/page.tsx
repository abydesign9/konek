"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

const BUSINESS_TYPES = [
  { id: "sme", label: "SME" },
  { id: "hr_bulk", label: "HR / bulk staff" },
  { id: "reward_platform", label: "Rewards platform" },
  { id: "travel_corporate", label: "Corporate travel" },
  { id: "white_label", label: "White label" },
];

export default function BusinessPage() {
  const [business, setBusiness] = useState<Business | null | undefined>(undefined);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [legalName, setLegalName] = useState("");
  const [businessType, setBusinessType] = useState("sme");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [purpose, setPurpose] = useState("staff_data");
  const [csv, setCsv] = useState("mtn,08011112222,1000\nglo,08033334444,500");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);

  function load() {
    fetch("/api/business/me")
      .then((res) => res.json())
      .then((data) => setBusiness(data.business));
    fetch("/api/business/bulk-batches")
      .then((res) => res.json())
      .then((data) => setBatches(data.batches ?? []));
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
        const [network, phone, amountNaira] = line.split(",").map((s) => s.trim());
        return { serviceType: "airtime", network, phone, amountMinor: Math.round(Number(amountNaira) * 100) };
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

  if (business === undefined) return <main className="min-h-screen bg-background px-6 py-8" />;

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <h1 className="font-heading text-xl font-bold text-indigo mb-6">Business account</h1>

      {!business && (
        <div className="rounded-2xl border border-indigo/10 bg-white p-5">
          <p className="text-sm text-indigo/70 mb-4">
            Apply for a business (KYB) account to run bulk VTU purchases for staff, rewards, or
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
            <p className="text-xs text-white/70 mt-2 capitalize">KYB: {business.kyb_status}</p>
          </div>

          {business.kyb_status === "verified" ? (
            <div className="rounded-2xl border border-indigo/10 bg-white p-5 mb-8">
              <p className="text-sm font-semibold text-indigo mb-3">Upload bulk batch</p>
              <label className="block text-sm text-indigo/60 mb-2">Purpose</label>
              <input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full rounded-xl border border-indigo/20 px-4 py-2.5 text-sm mb-4"
              />
              <label className="block text-sm text-indigo/60 mb-2">
                Items (network,phone,amount₦ — one per line)
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
              Bulk uploads unlock once an admin verifies your KYB status.
            </p>
          )}

          <p className="text-sm font-semibold text-indigo mb-3">Batches</p>
          <div className="flex flex-col gap-2 mb-8">
            {batches.map((b) => (
              <div key={b.id} className="rounded-xl border border-indigo/10 bg-white px-4 py-3">
                <p className="text-sm font-medium text-indigo">{b.purpose}</p>
                <p className="text-xs text-indigo/60">
                  {b.total_items} items · ₦{(Number(b.total_amount_minor) / 100).toLocaleString()} · {b.status}
                </p>
              </div>
            ))}
            {batches.length === 0 && <p className="text-sm text-indigo/50">No batches yet.</p>}
          </div>
        </>
      )}

      <Link href="/home" className="text-sm text-indigo/60 underline">
        Back to home
      </Link>
    </main>
  );
}
