"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChipPicker, MonogramBadge } from "@/components/ChipPicker";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";

interface Plan {
  id: string;
  external_id: string;
  name: string;
  network: string;
  price_minor: string;
  currency: string;
}

const BRANDS = [
  { id: "amazon", label: "Amazon", icon: <MonogramBadge text="am" className="bg-orange-500" /> },
  { id: "steam", label: "Steam", icon: <MonogramBadge text="St" className="bg-slate-700" /> },
  { id: "googleplay", label: "Google Play", icon: <MonogramBadge text="GP" className="bg-green-600" /> },
  { id: "itunes", label: "iTunes", icon: <MonogramBadge text="iT" className="bg-pink-500" /> },
  { id: "netflix", label: "Netflix", icon: <MonogramBadge text="N" className="bg-red-600" /> },
];

function usd(minor: number) {
  return `$${(minor / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

function BuyGiftCard() {
  const router = useRouter();
  const params = useSearchParams();

  const [brand, setBrand] = useState<string | null>(params.get("network"));
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  const brandLabel = BRANDS.find((b) => b.id === brand)?.label ?? brand;

  useEffect(() => {
    if (!brand) {
      setPlans([]);
      return;
    }
    fetch(`/api/catalog?serviceType=gift_card&network=${brand}`)
      .then((res) => res.json())
      .then((data) => {
        setPlans(data.plans ?? []);
        setSelectedPlan(null);
      });
  }, [brand]);

  function proceedToPin() {
    if (!brand || !selectedPlan) {
      setError("Choose a brand and an amount");
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
        serviceType: "gift_card",
        network: brand,
        phone: "", // gift cards have no subscriber id
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

    setCode(data.token ?? null);
  }

  if (code) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center text-center">
        <h1 className="font-heading text-xl font-bold text-indigo mb-2">{selectedPlan?.name} delivered</h1>
        <p className="text-indigo/60 mb-6">Redeem this code in your {brandLabel} account</p>
        <div className="rounded-2xl bg-gold/10 border border-gold/30 px-6 py-5 mb-8">
          <p className="font-mono text-2xl font-bold tracking-widest text-indigo break-all">{code}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/home")}
            className="rounded-xl bg-indigo text-white font-semibold px-6 py-3"
          >
            Back to home
          </button>
          <button
            onClick={() => router.push("/wallet/history")}
            className="rounded-xl border border-indigo/20 bg-white text-indigo font-semibold px-6 py-3"
          >
            View receipt
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
          <p className="text-sm text-indigo/60 mb-8 text-center">
            Charged in naira at today&rsquo;s rate. Enter your PIN to authorize.
          </p>
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
      <PageHeader title="Gift cards" backHref="/home" />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6">
      <p className="text-sm text-indigo/60 mb-6">Instant digital codes for the brands you love.</p>

      <label className="block text-sm text-indigo/60 mb-2">Brand</label>
      <ChipPicker options={BRANDS} value={brand} onChange={setBrand} columns={3} />

      {brand && (
        <>
          <label className="block text-sm text-indigo/60 mb-2">Amount</label>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {plans.length === 0 && (
              <p className="text-sm text-indigo/50 col-span-2">No {brandLabel} cards available yet.</p>
            )}
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan)}
                className={`rounded-xl border py-4 font-semibold transition-colors ${
                  selectedPlan?.id === plan.id
                    ? "border-konek-green bg-konek-green/10 text-indigo"
                    : "border-indigo/20 text-indigo hover:bg-indigo/5"
                }`}
              >
                {usd(Number(plan.price_minor))}
              </button>
            ))}
          </div>
        </>
      )}

      <button
        onClick={proceedToPin}
        className="w-full rounded-xl bg-indigo text-white py-3.5 font-semibold"
      >
        Buy gift card
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}

export default function BuyGiftCardPage() {
  return (
    <Suspense>
      <BuyGiftCard />
    </Suspense>
  );
}
