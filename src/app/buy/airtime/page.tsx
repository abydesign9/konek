"use client";

import { redirectIfKycGate } from "@/lib/kyc/gateRedirect";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";
import { CustomAmountField } from "@/components/CustomAmountField";

const NETWORKS = ["MTN", "Airtel", "Glo", "9mobile"];
const AMOUNTS = [10000, 50000, 100000, 200000];

function naira(minor: number) {
  return `₦${(minor / 100).toLocaleString()}`;
}

export default function AirtimePage() {
  const router = useRouter();

  const [network, setNetwork] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function continuePurchase() {
    if (!network) return setError("Select a network");
    if (!/^0\d{10}$/.test(phone)) return setError("Enter a valid phone number");
    if (!amount || amount < 10000) return setError("Minimum amount is ₦100");
    setError("");
    setShowPin(true);
  }

  async function submit(finalPin: string) {
    setLoading(true);
    setError("");
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceType: "airtime",
        network,
        phone,
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
          <h1 className="text-xl font-bold text-indigo">Airtime Successful</h1>
          <p className="text-sm text-indigo/60 mt-3">
            {network} airtime sent to {phone}
          </p>
          <button
            onClick={() => router.push("/wallet")}
            className="mt-6 w-full rounded-xl bg-indigo text-white py-3 font-semibold"
          >
            Done
          </button>
        </div>
      </main>
    );
  }

  if (showPin) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex items-center justify-center">
        <div className="max-w-xs w-full">
          <h1 className="text-lg font-bold text-indigo text-center mb-2">Confirm Airtime</h1>
          <p className="text-sm text-indigo/60 text-center mb-6">
            {network} · {naira(amount ?? 0)}
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
      <PageHeader title="Buy Airtime" backHref="/home" />
      <div className="max-w-lg mx-auto px-5 py-6">
        <p className="text-sm text-indigo/60 mb-6">Instant mobile recharge from your Konek wallet.</p>

        <label className="mb-2 block text-sm font-semibold text-indigo">Network</label>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {NETWORKS.map((item) => (
            <button
              key={item}
              onClick={() => setNetwork(item)}
              className={`rounded-xl py-3 text-sm font-semibold ${
                network === item ? "bg-indigo text-white" : "bg-white border border-indigo/15 text-indigo"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <label className="mb-2 block text-sm font-semibold text-indigo">Phone number</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number"
          inputMode="numeric"
          className="w-full rounded-xl border border-indigo/20 px-4 py-3 mb-6"
        />

        <label className="mb-2 block text-sm font-semibold text-indigo">Amount</label>
        <div className="grid grid-cols-2 gap-3">
          {AMOUNTS.map((item) => (
            <button
              key={item}
              onClick={() => setAmount(item)}
              className={`rounded-xl border py-3 font-semibold ${
                amount === item ? "border-konek-green bg-konek-green/10 text-indigo" : "border-indigo/20 text-indigo"
              }`}
            >
              {naira(item)}
            </button>
          ))}
        </div>
        <CustomAmountField value={amount} onChange={setAmount} presets={AMOUNTS} minMinor={10000} />

        <button
          onClick={continuePurchase}
          className="mt-8 w-full rounded-xl bg-indigo text-white py-3.5 font-semibold"
        >
          Continue
        </button>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}
