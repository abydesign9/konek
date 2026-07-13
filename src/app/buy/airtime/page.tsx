"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NetworkPicker } from "@/components/NetworkPicker";

const PRESETS_MINOR = [50000, 100000, 200000, 500000]; // ₦500 / ₦1,000 / ₦2,000 / ₦5,000

function formatNaira(minor: number) {
  return `₦${(minor / 100).toLocaleString()}`;
}

export default function BuyAirtimePage() {
  const router = useRouter();
  const [network, setNetwork] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [amountMinor, setAmountMinor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    if (!network || phone.length < 10 || !amountMinor) {
      setError("Choose a network, enter a phone number, and pick an amount");
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);

    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceType: "airtime",
        network,
        phone,
        amountMinor,
        idempotencyKey: crypto.randomUUID(),
      }),
    });

    setLoading(false);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    if (data.status === "failed") {
      setError("The vendor declined this purchase. No funds were charged.");
      return;
    }

    setSuccess(`₦${(amountMinor / 100).toLocaleString()} airtime delivered to ${phone}`);
    setTimeout(() => router.push("/home"), 1500);
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <h1 className="font-heading text-xl font-bold text-indigo mb-1">Buy airtime</h1>
      <p className="text-sm text-indigo/60 mb-6">Instant top-up, any Nigerian network.</p>

      <NetworkPicker value={network} onChange={setNetwork} />

      <label className="block text-sm text-indigo/60 mb-2">Phone number</label>
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="080..."
        className="w-full rounded-xl border border-indigo/20 px-4 py-3 text-base mb-6 focus:outline-none focus:ring-2 focus:ring-konek-green"
      />

      <label className="block text-sm text-indigo/60 mb-2">Amount</label>
      <div className="grid grid-cols-2 gap-3 mb-8">
        {PRESETS_MINOR.map((minor) => (
          <button
            key={minor}
            type="button"
            onClick={() => setAmountMinor(minor)}
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

      <button
        onClick={submit}
        disabled={loading}
        className="w-full rounded-xl bg-indigo text-white py-3.5 font-semibold disabled:opacity-50"
      >
        {loading ? "Processing…" : "Buy airtime"}
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-4 text-sm text-konek-green font-semibold">{success}</p>}
    </main>
  );
}
