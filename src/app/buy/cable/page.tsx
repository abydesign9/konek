"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChipPicker } from "@/components/ChipPicker";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";
import { IconCable, SERVICE_COLORS } from "@/components/icons";

const PROVIDERS = [
  { id: "dstv", label: "DStv" },
  { id: "gotv", label: "GOtv" },
  { id: "startimes", label: "StarTimes" },
];

interface Plan {
  id: string;
  external_id: string;
  name: string;
  network: string;
  price_minor: string;
  currency: string;
}

function BuyCable() {
  const router = useRouter();
  const params = useSearchParams();

  const [provider, setProvider] = useState<string | null>(params.get("network"));
  const [smartcardNo, setSmartcardNo] = useState(params.get("phone") ?? "");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const cableColor = SERVICE_COLORS.cable;

  useEffect(() => {
    if (!provider) {
      setPlans([]);
      return;
    }
    fetch(`/api/catalog?serviceType=cable&network=${provider}`)
      .then((res) => res.json())
      .then((data) => setPlans(data.plans ?? []));
  }, [provider]);

  function proceedToPin() {
    if (!provider || smartcardNo.length < 6 || !selectedPlan) {
      setError("Choose a provider, enter a smartcard number, and pick a package");
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
        serviceType: "cable",
        network: provider,
        phone: smartcardNo,
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

    await fetch("/api/beneficiaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: `${provider} •••• ${smartcardNo.slice(-4)}`,
        serviceType: "cable",
        details: { phone: smartcardNo, network: provider, planExternalId: selectedPlan!.external_id },
      }),
    });

    setSuccess(`${selectedPlan!.name} activated on ${smartcardNo}`);
    setTimeout(() => router.push("/home"), 1200);
  }

  if (showPin) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-xs">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center konek-card-shadow mx-auto mb-5"
            style={{ backgroundColor: cableColor.bg }}
          >
            <IconCable className="w-7 h-7" style={{ color: cableColor.fg }} />
          </div>
          <h1 className="font-heading text-lg font-bold text-indigo mb-1 text-center">
            Confirm {selectedPlan?.name} for {smartcardNo}
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
            className="mt-6 text-sm text-indigo/60 underline block mx-auto konek-tile"
          >
            Cancel
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="Buy cable TV" backHref="/home" />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center konek-card-shadow shrink-0"
          style={{ backgroundColor: cableColor.bg }}
        >
          <IconCable className="w-6 h-6" style={{ color: cableColor.fg }} />
        </div>
        <p className="text-sm text-indigo/60">DStv, GOtv, StarTimes.</p>
      </div>

      {/* ---------- Provider ---------- */}
      <section className="mt-7">
        <p className="text-sm font-semibold text-indigo mb-3">Provider</p>
        <div className="rounded-2xl bg-white konek-card-shadow p-3">
          <ChipPicker options={PROVIDERS} value={provider} onChange={setProvider} columns={3} />
        </div>
      </section>

      {/* ---------- Smartcard number ---------- */}
      <section className="mt-6">
        <label className="block text-sm font-semibold text-indigo mb-3">Smartcard / IUC number</label>
        <input
          type="text"
          inputMode="numeric"
          value={smartcardNo}
          onChange={(e) => setSmartcardNo(e.target.value)}
          placeholder="1234567890"
          className="w-full rounded-2xl bg-white konek-card-shadow border border-transparent px-4 py-3.5 text-base text-indigo focus:outline-none focus:ring-2 focus:ring-konek-green"
        />
      </section>

      {/* ---------- Package ---------- */}
      {provider && (
        <section className="mt-6">
          <label className="block text-sm font-semibold text-indigo mb-3">Package</label>
          <div className="flex flex-col gap-3 mb-2">
            {plans.length === 0 && (
              <p className="text-sm text-indigo/50 bg-white konek-card-shadow rounded-2xl px-4 py-3">
                No packages synced yet for {provider}.
              </p>
            )}
            {plans.map((plan) => {
              const active = selectedPlan?.id === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3.5 text-left konek-card-shadow konek-tile transition-colors ${
                    active ? "text-white" : "bg-white text-indigo"
                  }`}
                  style={active ? { backgroundColor: cableColor.fg } : undefined}
                >
                  <span className="text-sm font-semibold">{plan.name}</span>
                  <span className="text-sm font-bold">
                    ₦{(Number(plan.price_minor) / 100).toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------- CTA ---------- */}
      <button
        onClick={proceedToPin}
        className="w-full mt-8 rounded-2xl bg-indigo text-white py-4 font-heading font-bold text-base konek-card-shadow konek-tile"
      >
        Buy subscription
      </button>

      {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}
      {success && <p className="mt-4 text-sm text-konek-green font-semibold text-center">{success}</p>}
      </div>
    </main>
  );
}

export default function BuyCablePage() {
  return (
    <Suspense>
      <BuyCable />
    </Suspense>
  );
}
