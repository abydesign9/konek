"use client";

import { redirectIfKycGate } from "@/lib/kyc/gateRedirect";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";
import { CustomAmountField } from "@/components/CustomAmountField";

const PROVIDERS = ["Bet9ja", "SportyBet", "1xBet", "BetKing", "NairaBet", "MerryBet"];
// 8 quick amounts (₦100–₦20,000), Flyspeed-style.
const AMOUNTS = [10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000];

function money(minor: number) {
  return `₦${(minor / 100).toLocaleString()}`;
}

export default function BettingPage() {
  const router = useRouter();

  const [provider, setProvider] = useState("");
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function proceed() {
    if (!provider) return setError("Select betting provider");
    if (!account) return setError("Enter betting account ID");
    if (!amount) return setError("Select an amount");
    setError("");
    setShowPin(true);
  }

  async function submit(finalPin: string) {
    setLoading(true);
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceType: "betting",
        network: provider,
        phone: account,
        amountMinor: amount,
        pin: finalPin,
        idempotencyKey: crypto.randomUUID(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (redirectIfKycGate(res, data)) return;
    if (!res.ok) {
      setError(data.error ?? "Purchase failed");
      setShowPin(false);
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="rounded-3xl bg-white border border-indigo/10 p-8 text-center max-w-sm">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-indigo">Wallet Funding Successful</h1>
          <p className="text-sm text-indigo/60 mt-3">{provider} account funded successfully.</p>
          <button
            onClick={() => router.push("/wallet")}
            className="mt-6 rounded-xl bg-indigo text-white px-8 py-3 font-semibold"
          >
            Done
          </button>
        </div>
      </main>
    );
  }

  if (showPin) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-xs w-full">
          <h1 className="text-center text-lg font-bold text-indigo mb-2">Confirm Betting Funding</h1>
          <p className="text-center text-sm text-indigo/60 mb-6">
            {provider} · {money(amount ?? 0)}
          </p>
          <PinPad value={pin} onChange={setPin} onComplete={submit} />
          {loading && <p className="text-center text-sm text-indigo/50 mt-4">Processing…</p>}
          {error && <p className="text-center text-sm text-red-600 mt-4">{error}</p>}
          <button
            onClick={() => {
              setShowPin(false);
              setPin("");
            }}
            className="mt-6 block mx-auto text-sm text-indigo/60 underline"
          >
            Cancel
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="Betting" backHref="/home" />
      <div className="max-w-lg mx-auto px-5 py-6">
        <p className="text-sm text-indigo/60 mb-6">Fund your betting wallet instantly.</p>

        <label className="mb-2 block text-sm font-semibold text-indigo">Provider</label>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {PROVIDERS.map((item) => (
            <button
              key={item}
              onClick={() => setProvider(item)}
              className={`rounded-xl py-3 font-semibold ${
                provider === item ? "bg-indigo text-white" : "bg-white border border-indigo/15 text-indigo"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <label className="mb-2 block text-sm font-semibold text-indigo">Account / customer ID</label>
        <input
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder="Betting account ID"
          className="w-full rounded-xl border border-indigo/20 px-4 py-3 mb-6"
        />

        <label className="mb-2 block text-sm font-semibold text-indigo">Amount</label>
        <div className="grid grid-cols-4 gap-2">
          {AMOUNTS.map((item) => (
            <button
              key={item}
              onClick={() => setAmount(item)}
              className={`rounded-xl border py-3 text-sm font-semibold ${
                amount === item ? "border-raviion-green bg-raviion-green/10 text-indigo" : "border-indigo/20 text-indigo"
              }`}
            >
              {money(item)}
            </button>
          ))}
        </div>
        <CustomAmountField value={amount} onChange={setAmount} presets={AMOUNTS} minMinor={10000} />

        <button onClick={proceed} className="mt-8 w-full rounded-xl bg-indigo text-white py-3.5 font-semibold">
          Continue
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}
