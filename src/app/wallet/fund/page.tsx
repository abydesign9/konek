"use client";

import { useState } from "react";

const PRESETS_MINOR = [100000, 200000, 500000, 1000000]; // ₦1,000 / ₦2,000 / ₦5,000 / ₦10,000

function formatNaira(minor: number) {
  return `₦${(minor / 100).toLocaleString()}`;
}

export default function FundWalletPage() {
  const [amountMinor, setAmountMinor] = useState<number | null>(null);
  const [customNaira, setCustomNaira] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = amountMinor ?? (customNaira ? Math.round(Number(customNaira) * 100) : null);

  async function fundWallet() {
    if (!selected || !Number.isInteger(selected) || selected < 10000) {
      setError("Enter at least ₦100");
      return;
    }
    setError(null);
    setLoading(true);

    const idempotencyKey = crypto.randomUUID();
    const res = await fetch("/api/wallet/fund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountMinor: selected, idempotencyKey }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }

    const data = await res.json();
    window.location.href = data.authorizationUrl;
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <h1 className="font-heading text-xl font-bold text-indigo mb-1">Fund wallet</h1>
      <p className="text-sm text-indigo/60 mb-8">Choose an amount to add to your NGN wallet.</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {PRESETS_MINOR.map((minor) => (
          <button
            key={minor}
            onClick={() => {
              setAmountMinor(minor);
              setCustomNaira("");
            }}
            className={`rounded-xl border py-4 font-semibold transition-colors ${
              amountMinor === minor
                ? "border-konek-green bg-konek-green/10 text-indigo"
                : "border-indigo/20 text-indigo hover:bg-indigo/5"
            }`}
          >
            {formatNaira(minor)}
          </button>
        ))}
      </div>

      <label className="block text-sm text-indigo/60 mb-2">Or enter a custom amount (₦)</label>
      <input
        type="number"
        inputMode="decimal"
        min={100}
        value={customNaira}
        onChange={(e) => {
          setCustomNaira(e.target.value);
          setAmountMinor(null);
        }}
        placeholder="e.g. 1500"
        className="w-full rounded-xl border border-indigo/20 px-4 py-3 text-base mb-6 focus:outline-none focus:ring-2 focus:ring-konek-green"
      />

      <button
        onClick={fundWallet}
        disabled={loading || !selected}
        className="w-full rounded-xl bg-indigo text-white py-3.5 font-semibold disabled:opacity-50"
      >
        {loading ? "Redirecting…" : selected ? `Fund with ${formatNaira(selected)}` : "Fund wallet"}
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </main>
  );
}
