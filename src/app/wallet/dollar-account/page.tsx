"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

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
  ngnBalanceMinor: number;
  inflows: Inflow[];
}

const NGN_PER_USD = 1600;
const SPREAD = 0.015;

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* no-op */
        }
      }}
      className="w-full flex items-center justify-between py-2.5 border-b border-indigo/5 last:border-0 text-left"
    >
      <span>
        <span className="block text-xs text-indigo/50">{label}</span>
        <span className="block font-mono text-sm text-indigo">{value}</span>
      </span>
      <span className="text-xs font-semibold text-konek-green ml-3">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

export default function DollarAccountPage() {
  const [data, setData] = useState<DollarAccountData | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [convertUsd, setConvertUsd] = useState("");
  const [converting, setConverting] = useState(false);
  const [convertMsg, setConvertMsg] = useState<string | null>(null);

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

  async function convert() {
    const usd = Math.round(Number(convertUsd) * 100);
    if (!Number.isInteger(usd) || usd <= 0) {
      setConvertMsg("Enter a valid USD amount");
      return;
    }
    setConverting(true);
    setConvertMsg(null);
    const res = await fetch("/api/dollar-account/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usdMinor: usd, idempotencyKey: crypto.randomUUID() }),
    });
    const body = await res.json().catch(() => ({}));
    setConverting(false);
    if (!res.ok) {
      setConvertMsg(body.error ?? "Conversion failed");
      return;
    }
    setConvertMsg(`Converted $${(body.usdMinor / 100).toLocaleString()} → ₦${(body.ngnMinor / 100).toLocaleString()}`);
    setConvertUsd("");
    load();
  }

  if (!data) return <main className="min-h-screen bg-background" />;

  const usdPreview = Math.round(Number(convertUsd) * 100);
  const ngnPreview = usdPreview > 0 ? Math.floor(usdPreview * NGN_PER_USD * (1 - SPREAD)) : 0;

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="Dollar account" backHref="/home" />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6">
      <p className="text-sm text-indigo/60 mb-6">
        Receive salary, freelance and client payments in USD. Receive-only — no outbound transfers.
      </p>

      {!data.account && data.kycTier < 2 && (
        <div className="rounded-2xl border border-gold/30 bg-gold/10 p-5">
          <p className="text-sm text-indigo mb-3">
            A dollar account needs KYC Tier 2 (liveness). You&rsquo;re currently Tier {data.kycTier}.
          </p>
          <Link href="/kyc" className="inline-block rounded-xl bg-indigo text-white font-semibold px-5 py-2.5 text-sm">
            Verify now
          </Link>
        </div>
      )}

      {!data.account && data.kycTier >= 2 && (
        <div className="rounded-2xl border border-indigo/10 bg-white p-5">
          <p className="text-sm text-indigo/70 mb-4">
            Get US account details to receive dollars from anywhere. Convert to naira anytime to spend
            on airtime, data, bills, eSIMs and more.
          </p>
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
          <div className="rounded-2xl bg-indigo px-5 py-4 text-white mb-4">
            <p className="text-xs text-white/60 mb-1">USD balance</p>
            <p className="font-heading text-2xl font-bold">
              ${(data.balanceMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-white/70 mt-2">
              Naira wallet: ₦{(data.ngnBalanceMinor / 100).toLocaleString()}
            </p>
          </div>

          {/* Account details to receive money */}
          <p className="text-sm text-indigo/60 mb-2">Share these to get paid</p>
          <div className="rounded-2xl border border-indigo/10 bg-white px-5 py-2 mb-6">
            <CopyRow label="Account number" value={data.account.account_number} />
            <CopyRow label="Routing number (ACH)" value={data.account.routing_number} />
            <CopyRow label="Bank" value={data.account.bank_name} />
          </div>

          {/* Convert USD -> NGN */}
          <div className="rounded-2xl border border-konek-green/30 bg-konek-green/5 p-5 mb-6">
            <p className="font-heading font-semibold text-indigo mb-1">Convert to naira</p>
            <p className="text-xs text-indigo/60 mb-4">
              Move dollars into your naira wallet to spend on any Konek service.
            </p>
            <div className="flex gap-2 mb-3">
              <input
                inputMode="decimal"
                value={convertUsd}
                onChange={(e) => setConvertUsd(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="USD amount"
                className="flex-1 rounded-xl border border-indigo/20 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-konek-green"
              />
              <button
                onClick={convert}
                disabled={converting || usdPreview <= 0}
                className="rounded-xl bg-konek-green text-white font-semibold px-5 disabled:opacity-50"
              >
                {converting ? "…" : "Convert"}
              </button>
            </div>
            {ngnPreview > 0 && (
              <p className="text-xs text-indigo/60">
                You&rsquo;ll get ≈ ₦{(ngnPreview / 100).toLocaleString()} (rate ₦{NGN_PER_USD.toLocaleString()}/$ · {SPREAD * 100}% spread)
              </p>
            )}
            {convertMsg && <p className="text-sm text-konek-green font-semibold mt-2">{convertMsg}</p>}
          </div>

          <button
            onClick={simulateInflow}
            disabled={simulating}
            className="w-full rounded-xl border border-indigo/20 text-indigo font-semibold px-6 py-3 mb-8 disabled:opacity-50"
          >
            {simulating ? "Simulating…" : "Simulate a $50 inflow (dev only)"}
          </button>

          <p className="text-sm text-indigo/60 mb-3">Inflows</p>
          <div className="flex flex-col gap-2 mb-6">
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

          <p className="text-xs text-indigo/40 mb-8">
            To cash out, convert to naira, then withdraw to your own verified Nigerian bank account.
            Konek never sends money to third parties.
          </p>
        </>
      )}
      </div>
    </main>
  );
}
