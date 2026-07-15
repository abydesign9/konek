"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NetworkPicker } from "@/components/NetworkPicker";
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

interface Beneficiary {
  id: string;
  label: string;
  details: { phone: string; network: string; planExternalId?: string; planName?: string };
}

function BuyData() {
  const router = useRouter();
  const params = useSearchParams();

  const [network, setNetwork] = useState<string | null>(params.get("network"));
  const [phone, setPhone] = useState(params.get("phone") ?? "");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/beneficiaries?serviceType=data")
      .then((res) => res.json())
      .then((data) => setBeneficiaries(data.beneficiaries ?? []));
  }, []);

  useEffect(() => {
    if (!network) {
      setPlans([]);
      return;
    }
    fetch(`/api/catalog?serviceType=data&network=${network}`)
      .then((res) => res.json())
      .then((data) => {
        const list: Plan[] = data.plans ?? [];
        setPlans(list);
        const prefillPlanId = params.get("planExternalId");
        if (prefillPlanId) {
          const match = list.find((p) => p.external_id === prefillPlanId);
          if (match) setSelectedPlan(match);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network]);

  function pickBeneficiary(b: Beneficiary) {
    setNetwork(b.details.network);
    setPhone(b.details.phone);
    setSelectedPlan(null); // plan resolves once that network's catalog loads
  }

  function proceedToPin() {
    if (!network || phone.length < 10 || !selectedPlan) {
      setError("Choose a network, enter a phone number, and pick a plan");
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
        serviceType: "data",
        network,
        phone,
        amountMinor: Number(selectedPlan!.price_minor),
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
        label: `${network} •••• ${phone.slice(-4)}`,
        serviceType: "data",
        details: { phone, network, planExternalId: selectedPlan!.external_id, planName: selectedPlan!.name },
      }),
    });

    setSuccess(`${selectedPlan!.name} delivered to ${phone}`);
    setTimeout(() => router.push("/home"), 1200);
  }

  if (showPin) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-xs">
          <h1 className="font-heading text-lg font-bold text-indigo mb-1 text-center">
            Confirm {selectedPlan?.name} to {phone}
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
      <PageHeader title="Buy data" backHref="/home" />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6">
      <p className="text-sm text-indigo/60 mb-6">Data bundles for any Nigerian network.</p>

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

      {network && (
        <>
          <label className="block text-sm text-indigo/60 mb-2">Plan</label>
          <div className="flex flex-col gap-2 mb-8">
            {plans.length === 0 && (
              <p className="text-sm text-indigo/50">No plans synced yet for {network}.</p>
            )}
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan)}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                  selectedPlan?.id === plan.id
                    ? "border-konek-green bg-konek-green/10"
                    : "border-indigo/20 hover:bg-indigo/5"
                }`}
              >
                <span className="text-sm font-medium text-indigo">{plan.name}</span>
                <span className="text-sm font-semibold text-indigo">
                  ₦{(Number(plan.price_minor) / 100).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <button
        onClick={proceedToPin}
        className="w-full rounded-xl bg-indigo text-white py-3.5 font-semibold"
      >
        Buy data
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-4 text-sm text-konek-green font-semibold">{success}</p>}
      </div>
    </main>
  );
}

export default function BuyDataPage() {
  return (
    <Suspense>
      <BuyData />
    </Suspense>
  );
}
