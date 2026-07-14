"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Account {
  id: string;
  account_number: string;
  routing_number: string;
  bank_name: string;
  status: string;
}

interface Inflow {
  sender_name: string;
  sender_bank: string;
  amount_minor: string;
  status: string;
  received_at: string;
}

interface DollarAccountData {
  kycTier: number;
  account: Account | null;
  balanceMinor: number;
  inflows: Inflow[];
}

export default function DollarAccountPage() {
  const [data, setData] = useState<DollarAccountData | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  function load() {
    fetch("/api/dollar-account/me")
      .then((res) => res.json())
      .then(setData);
  }

  useEffect(load, []);

  async function create() {
    setCreating(true);
    setError(null);
    const res = await fetch("/api/dollar-account/create", { method: "POST" });
    setCreating(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong");
      return;
    }
    load();
  }

  async function simulateInflow() {
    setSimulating(true);
    await fetch("/api/dollar-account/mock-inflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountMinor: 5000, senderName: "Jane Diaspora" }),
    });
    setSimulating(false);
    load();
  }

  if (!data) return <main className="min-h-screen bg-background px-6 py-8" />;

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <h1 className="font-heading text-xl font-bold text-indigo mb-1">Dollar account</h1>
      <p className="text-sm text-indigo/60 mb-6">Receive USD from anywhere — receive-only, no outbound transfers.</p>

      {!data.account && data.kycTier < 2 && (
        <div className="rounded-2xl border border-gold/30 bg-gold/10 p-5">
          <p className="text-sm text-indigo">
            A dollar account requires KYC Tier 2 (liveness verification). Your account is currently
            Tier {data.kycTier}.
          </p>
        </div>
      )}

      {!data.account && data.kycTier >= 2 && (
        <div className="rounded-2xl border border-indigo/10 bg-white p-5">
          <button
            onClick={create}
            disabled={creating}
            className="rounded-xl bg-indigo text-white font-semibold px-6 py-3 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create dollar account"}
          </button>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>
      )}

      {data.account && (
        <>
          <div className="rounded-2xl bg-indigo px-5 py-4 text-white mb-6">
            <p className="text-xs text-white/60 mb-1">Balance</p>
            <p className="font-heading text-2xl font-bold">${(data.balanceMinor / 100).toLocaleString()}</p>
          </div>

          <div className="rounded-2xl border border-indigo/10 bg-white p-5 mb-6">
            <p className="text-xs text-indigo/60 mb-1">Account number</p>
            <p className="font-mono text-sm text-indigo mb-3">{data.account.account_number}</p>
            <p className="text-xs text-indigo/60 mb-1">Routing number</p>
            <p className="font-mono text-sm text-indigo mb-3">{data.account.routing_number}</p>
            <p className="text-xs text-indigo/60 mb-1">Bank</p>
            <p className="text-sm text-indigo">{data.account.bank_name}</p>
          </div>

          <button
            onClick={simulateInflow}
            disabled={simulating}
            className="w-full rounded-xl border border-indigo/20 text-indigo font-semibold px-6 py-3 mb-8 disabled:opacity-50"
          >
            {simulating ? "Simulating…" : "Simulate a $50 inflow (dev only)"}
          </button>

          <p className="text-sm text-indigo/60 mb-3">Inflows</p>
          <div className="flex flex-col gap-2 mb-8">
            {data.inflows.length === 0 && <p className="text-sm text-indigo/50">No inflows yet.</p>}
            {data.inflows.map((inflow, i) => (
              <div key={i} className="rounded-xl border border-indigo/10 bg-white px-4 py-3">
                <p className="text-sm font-medium text-indigo">
                  ${(Number(inflow.amount_minor) / 100).toLocaleString()} from {inflow.sender_name}
                </p>
                <p className="text-xs text-indigo/60">
                  {inflow.sender_bank} · {inflow.status}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <Link href="/home" className="text-sm text-indigo/60 underline">
        Back to home
      </Link>
    </main>
  );
}
