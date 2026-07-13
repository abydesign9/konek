"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChipPicker } from "@/components/ChipPicker";
import { PinPad } from "@/components/PinPad";

const BOARDS = [
  { id: "waec", label: "WAEC" },
  { id: "neco", label: "NECO" },
  { id: "jamb", label: "JAMB" },
];

interface Plan {
  id: string;
  external_id: string;
  name: string;
  network: string;
  price_minor: string;
  currency: string;
}

function BuyExamPin() {
  const router = useRouter();
  const params = useSearchParams();

  const [board, setBoard] = useState<string | null>(params.get("network"));
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/catalog?serviceType=exam_pin`)
      .then((res) => res.json())
      .then((data) => setPlans(data.plans ?? []));
  }, []);

  const plansForBoard = plans.filter((p) => p.network === board);

  function proceedToPin() {
    if (!board || !selectedPlan) {
      setError("Choose an exam board and pin type");
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
        serviceType: "exam_pin",
        network: board,
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

    setToken(data.token ?? null);
  }

  if (token) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center text-center">
        <h1 className="font-heading text-xl font-bold text-indigo mb-2">Your PIN is ready</h1>
        <p className="text-indigo/60 mb-6">{selectedPlan?.name}</p>
        <p className="font-mono text-2xl font-bold tracking-widest text-konek-green mb-8">{token}</p>
        <button onClick={() => router.push("/home")} className="rounded-xl bg-indigo text-white font-semibold px-6 py-3">
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
      <h1 className="font-heading text-xl font-bold text-indigo mb-1">Buy exam PIN</h1>
      <p className="text-sm text-indigo/60 mb-6">WAEC, NECO, JAMB result checkers & ePINs.</p>

      <ChipPicker options={BOARDS} value={board} onChange={setBoard} columns={3} />

      {board && (
        <div className="flex flex-col gap-2 mb-8">
          {plansForBoard.map((plan) => (
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
                ₦{(Number(plan.price_minor) / 100).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      )}

      <button onClick={proceedToPin} className="w-full rounded-xl bg-indigo text-white py-3.5 font-semibold">
        Buy PIN
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </main>
  );
}

export default function BuyExamPinPage() {
  return (
    <Suspense>
      <BuyExamPin />
    </Suspense>
  );
}
