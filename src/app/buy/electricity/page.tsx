"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChipPicker } from "@/components/ChipPicker";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";

const DISCOS = [
  { id: "ikeja", label: "Ikeja Electric" },
  { id: "eko", label: "Eko Disco" },
  { id: "abuja", label: "Abuja Disco" },
  { id: "phcn", label: "PHCN" },
];
const PRESETS_MINOR = [200000, 500000, 1000000, 2000000]; // ₦2,000 / ₦5,000 / ₦10,000 / ₦20,000

function formatNaira(minor: number) {
  return `₦${(minor / 100).toLocaleString()}`;
}

function BuyElectricity() {
  const router = useRouter();
  const params = useSearchParams();

  const [disco, setDisco] = useState<string | null>(params.get("network"));
  const [meterNo, setMeterNo] = useState(params.get("phone") ?? "");
  const [amountMinor, setAmountMinor] = useState<number | null>(
    params.get("amountMinor") ? Number(params.get("amountMinor")) : null
  );
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  function proceedToPin() {
    if (!disco || meterNo.length < 6 || !amountMinor) {
      setError("Choose a disco, enter a meter number, and pick an amount");
      return;
    }
    setError(null);
    setShowPin(true);
  }

  async function submit(finalPin: string) {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceType: "electricity",
        network: disco,
        phone: meterNo,
        amountMinor,
        pin: finalPin,
        idempotencyKey: crypto.randomUUID(),
      }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (res.status === 428) {
      router.push(`/settings/pin?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setPin("");
      setShowPin(false);
      return;
    }
    if (data.status === "failed") {
      setError("The vendor declined this purchase. No funds were charged.");
      setPin("");
      setShowPin(false);
      return;
    }

    await fetch("/api/beneficiaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: `${disco} •••• ${meterNo.slice(-4)}`,
        serviceType: "electricity",
        details: { phone: meterNo, network: disco },
      }),
    });

    setToken(data.token ?? null);
  }

  if (token) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center text-center">
        <h1 className="font-heading text-xl font-bold text-indigo mb-2">Token generated</h1>
        <p className="text-indigo/60 mb-6">Enter this on your meter</p>
        <p className="font-mono text-2xl font-bold tracking-widest text-konek-green mb-8">{token}</p>
        <button
          onClick={() => router.push("/home")}
          className="rounded-xl bg-indigo text-white font-semibold px-6 py-3"
        >
          Back to home
        </button>
      </main>
    );
  }

  if (showPin) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-xs">
          <h1 className="font-heading text-lg font-bold text-indigo mb-1 text-center">
            Confirm {formatNaira(amountMinor ?? 0)} to {meterNo}
          </h1>
          <p className="text-sm text-indigo/60 mb-8 text-center">Enter your PIN to authorize.</p>
          <PinPad value={pin} onChange={setPin} onComplete={submit} />
          {loading && <p className="mt-4 text-sm text-indigo/60 text-center">Processing…</p>}
          {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}
          <button
            onClick={() => {
              setShowPin(false);
              setPin("");
            }}
            className="mt-6 text-sm text-indigo/60 underline block mx-auto"
          >
            Cancel
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="Buy electricity" backHref="/home" />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6">
      <p className="text-sm text-indigo/60 mb-6">Prepaid tokens, any disco.</p>

      <ChipPicker options={DISCOS} value={disco} onChange={setDisco} />

      <label className="block text-sm text-indigo/60 mb-2">Meter number</label>
      <input
        type="text"
        inputMode="numeric"
        value={meterNo}
        onChange={(e) => setMeterNo(e.target.value)}
        placeholder="0123456789"
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
        onClick={proceedToPin}
        className="w-full rounded-xl bg-indigo text-white py-3.5 font-semibold"
      >
        Buy electricity
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}

export default function BuyElectricityPage() {
  return (
    <Suspense>
      <BuyElectricity />
    </Suspense>
  );
}
