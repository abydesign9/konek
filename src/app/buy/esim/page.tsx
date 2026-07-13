"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChipPicker } from "@/components/ChipPicker";
import { PinPad } from "@/components/PinPad";

const COUNTRIES = [
  { id: "us", label: "USA" },
  { id: "uk", label: "UK" },
  { id: "eu", label: "Europe" },
];

interface Plan {
  id: string;
  external_id: string;
  name: string;
  network: string;
  price_minor: string;
  currency: string;
}

// Cheap deterministic "QR" placeholder — a checkerboard pattern seeded from
// the activation code, so it visually differs per eSIM without a QR lib.
function FakeQr({ seed }: { seed: string }) {
  const size = 10;
  const hash = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const cells = Array.from({ length: size * size }, (_, i) => ((hash + i * 2654435761) % 997) % 5 < 2);
  return (
    <div
      className="grid gap-0.5 w-48 h-48 bg-white p-3 rounded-xl border border-indigo/10"
      style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
    >
      {cells.map((on, i) => (
        <div key={i} className={on ? "bg-indigo" : "bg-transparent"} />
      ))}
    </div>
  );
}

function BuyEsim() {
  const router = useRouter();

  const [country, setCountry] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ token: string; txnId: string } | null>(null);

  useEffect(() => {
    if (!country) {
      setPlans([]);
      return;
    }
    fetch(`/api/catalog?serviceType=esim&network=${country}`)
      .then((res) => res.json())
      .then((data) => setPlans(data.plans ?? []));
  }, [country]);

  function proceedToPin() {
    if (!country || !selectedPlan) {
      setError("Choose a country and plan");
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
        serviceType: "esim",
        network: country,
        phone: "na",
        planExternalId: selectedPlan!.external_id,
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

    setIssued({ token: data.token, txnId: data.txnId });
  }

  if (issued) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center text-center">
        <h1 className="font-heading text-xl font-bold text-indigo mb-2">eSIM issued</h1>
        <p className="text-indigo/60 mb-6">Scan to install — {selectedPlan?.name}</p>
        <FakeQr seed={issued.token} />
        <p className="font-mono text-xs text-indigo/50 mt-4 mb-8">{issued.token}</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <a
            href={`/esim/${issued.txnId}`}
            className="rounded-xl border border-indigo/20 text-indigo text-center font-semibold px-6 py-3"
          >
            View usage
          </a>
          <button onClick={() => router.push("/home")} className="rounded-xl bg-indigo text-white font-semibold px-6 py-3">
            Back to home
          </button>
        </div>
      </main>
    );
  }

  if (showPin) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-xs">
          <h1 className="font-heading text-lg font-bold text-indigo mb-1 text-center">
            Confirm {selectedPlan?.name}
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
      <h1 className="font-heading text-xl font-bold text-indigo mb-1">Buy eSIM</h1>
      <p className="text-sm text-indigo/60 mb-6">
        Priced in USD, charged from your NGN wallet at today&apos;s rate.
      </p>

      <ChipPicker options={COUNTRIES} value={country} onChange={setCountry} columns={3} />

      {country && (
        <div className="flex flex-col gap-2 mb-8">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan)}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                selectedPlan?.id === plan.id ? "border-konek-green bg-konek-green/10" : "border-indigo/20 hover:bg-indigo/5"
              }`}
            >
              <span className="text-sm font-medium text-indigo">{plan.name}</span>
              <span className="text-sm font-semibold text-indigo">
                ${(Number(plan.price_minor) / 100).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      )}

      <button onClick={proceedToPin} className="w-full rounded-xl bg-indigo text-white py-3.5 font-semibold">
        Buy eSIM
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </main>
  );
}

export default function BuyEsimPage() {
  return (
    <Suspense>
      <BuyEsim />
    </Suspense>
  );
}
