"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";
import { CustomAmountField } from "@/components/CustomAmountField";

const PROVIDERS = ["IKEDC", "EKEDC", "AEDC", "PHED", "IBEDC"];
const AMOUNTS = [100000, 200000, 500000, 1000000];

function money(minor: number) {
  return `₦${(minor / 100).toLocaleString()}`;
}

export default function ElectricityPage() {
  const router = useRouter();

  const [provider, setProvider] = useState("");
  const [meter, setMeter] = useState("");
  const [meterType, setMeterType] = useState<"prepaid" | "postpaid">("prepaid");
  const [amount, setAmount] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Meter verification: confirm the registered customer before paying.
  const [verifying, setVerifying] = useState(false);
  const [customerName, setCustomerName] = useState<string | null>(null);

  async function verifyMeter() {
    if (!provider) return setError("Select electricity provider first");
    if (!meter) return setError("Enter meter number");
    setVerifying(true);
    setError("");
    setCustomerName(null);
    const res = await fetch("/api/verify/meter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disco: provider, meterNo: meter, meterType }),
    });
    const data = await res.json().catch(() => ({}));
    setVerifying(false);
    if (!res.ok || !data.verified) {
      setError(data.error ?? "Could not verify this meter");
      return;
    }
    setCustomerName(data.customerName);
  }

  // Re-verification is required whenever the meter/provider changes.
  function resetVerification() {
    setCustomerName(null);
  }

  function proceed() {
    if (!provider) return setError("Select electricity provider");
    if (!meter) return setError("Enter meter number");
    if (!customerName) return setError("Verify the meter number first");
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
        serviceType: "electricity",
        network: provider,
        phone: meter,
        amountMinor: amount,
        pin: finalPin,
        idempotencyKey: crypto.randomUUID(),
        recipientExtra: { meterType },
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
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
          <div className="text-5xl mb-4">⚡</div>
          <h1 className="text-xl font-bold text-indigo">Electricity Payment Successful</h1>
          <p className="text-sm text-indigo/60 mt-3">
            {provider} {meterType} meter payment completed.
          </p>
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
          <h1 className="text-center text-lg font-bold text-indigo mb-2">Confirm Electricity Payment</h1>
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
      <PageHeader title="Electricity" backHref="/home" />
      <div className="max-w-lg mx-auto px-5 py-6">
        <p className="text-sm text-indigo/60 mb-6">Pay electricity bills instantly from your Konek wallet.</p>

        <label className="mb-2 block text-sm font-semibold text-indigo">Provider</label>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {PROVIDERS.map((item) => (
            <button
              key={item}
              onClick={() => { setProvider(item); resetVerification(); }}
              className={`rounded-xl py-3 font-semibold ${
                provider === item ? "bg-indigo text-white" : "bg-white border border-indigo/15 text-indigo"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {(["prepaid", "postpaid"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setMeterType(t); resetVerification(); }}
              className={`rounded-xl py-3 font-semibold capitalize ${
                meterType === t ? "bg-konek-green/20 border border-konek-green text-indigo" : "bg-white border border-indigo/15 text-indigo"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <label className="mb-2 block text-sm font-semibold text-indigo">Meter number</label>
        <div className="mb-2 flex gap-2">
          <input
            value={meter}
            onChange={(e) => { setMeter(e.target.value); resetVerification(); }}
            placeholder="Meter number"
            inputMode="numeric"
            className="flex-1 rounded-xl border border-indigo/20 px-4 py-3"
          />
          <button
            onClick={verifyMeter}
            disabled={verifying || !meter || !provider}
            className="rounded-xl bg-indigo px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {verifying ? "…" : "Verify"}
          </button>
        </div>
        {customerName ? (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-konek-green/10 px-4 py-2.5 text-sm">
            <span className="text-konek-green">✓</span>
            <span className="font-semibold text-indigo">{customerName}</span>
          </div>
        ) : (
          <p className="mb-6 text-xs text-indigo/50">Verify the meter to confirm the customer name before paying.</p>
        )}

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
