"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NetworkPicker } from "@/components/NetworkPicker";
import { PinPad } from "@/components/PinPad";

const PRESETS_MINOR = [50000, 100000, 200000, 500000]; // ₦500 / ₦1,000 / ₦2,000 / ₦5,000

interface Beneficiary {
  id: string;
  label: string;
  details: { phone: string; network: string };
}

function formatNaira(minor: number) {
  return `₦${(minor / 100).toLocaleString()}`;
}

function BuyAirtime() {
  const router = useRouter();
  const params = useSearchParams();

  const [network, setNetwork] = useState<string | null>(params.get("network"));
  const [phone, setPhone] = useState(params.get("phone") ?? "");
  const [amountMinor, setAmountMinor] = useState<number | null>(
    params.get("amountMinor") ? Number(params.get("amountMinor")) : null
  );
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/beneficiaries?serviceType=airtime")
      .then((res) => res.json())
      .then((data) => setBeneficiaries(data.beneficiaries ?? []));
  }, []);

  function pickBeneficiary(b: Beneficiary) {
    setNetwork(b.details.network);
    setPhone(b.details.phone);
  }

  function proceedToPin() {
    if (!network || phone.length < 10 || !amountMinor) {
      setError("Choose a network, enter a phone number, and pick an amount");
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
        serviceType: "airtime",
        network,
        phone,
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
        label: `${network} •••• ${phone.slice(-4)}`,
        serviceType: "airtime",
        details: { phone, network },
      }),
    });

    setSuccess(`₦${((amountMinor ?? 0) / 100).toLocaleString()} airtime delivered to ${phone}`);
    setTimeout(() => router.push("/home"), 1200);
  }

  if (showPin) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-xs">
          <h1 className="font-heading text-lg font-bold text-indigo mb-1 text-center">
            Confirm {formatNaira(amountMinor ?? 0)} to {phone}
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
    <main className="min-h-screen bg-background px-6 py-8">
      <h1 className="font-heading text-xl font-bold text-indigo mb-1">Buy airtime</h1>
      <p className="text-sm text-indigo/60 mb-6">Instant top-up, any Nigerian network.</p>

      {beneficiaries.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-indigo/60 mb-2">Buy again</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {beneficiaries.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => pickBeneficiary(b)}
                className="whitespace-nowrap rounded-full border border-indigo/20 px-4 py-2 text-sm font-medium text-indigo hover:bg-indigo/5"
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
        onClick={proceedToPin}
        className="w-full rounded-xl bg-indigo text-white py-3.5 font-semibold"
      >
        Buy airtime
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-4 text-sm text-konek-green font-semibold">{success}</p>}
    </main>
  );
}

export default function BuyAirtimePage() {
  return (
    <Suspense>
      <BuyAirtime />
    </Suspense>
  );
}
