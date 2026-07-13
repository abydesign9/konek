"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NetworkPicker } from "@/components/NetworkPicker";

interface Plan {
  id: string;
  external_id: string;
  name: string;
  network: string;
  price_minor: string;
  currency: string;
}

export default function BuyDataPage() {
  const router = useRouter();
  const [network, setNetwork] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!network) {
      setPlans([]);
      setSelectedPlan(null);
      return;
    }
    fetch(`/api/catalog?serviceType=data&network=${network}`)
      .then((res) => res.json())
      .then((data) => setPlans(data.plans ?? []));
    setSelectedPlan(null);
  }, [network]);

  async function submit() {
    if (!network || phone.length < 10 || !selectedPlan) {
      setError("Choose a network, enter a phone number, and pick a plan");
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);

    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceType: "data",
        network,
        phone,
        amountMinor: Number(selectedPlan.price_minor),
        planExternalId: selectedPlan.external_id,
        idempotencyKey: crypto.randomUUID(),
      }),
    });

    setLoading(false);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    if (data.status === "failed") {
      setError("The vendor declined this purchase. No funds were charged.");
      return;
    }

    setSuccess(`${selectedPlan.name} delivered to ${phone}`);
    setTimeout(() => router.push("/home"), 1500);
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <h1 className="font-heading text-xl font-bold text-indigo mb-1">Buy data</h1>
      <p className="text-sm text-indigo/60 mb-6">Data bundles for any Nigerian network.</p>

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
        onClick={submit}
        disabled={loading}
        className="w-full rounded-xl bg-indigo text-white py-3.5 font-semibold disabled:opacity-50"
      >
        {loading ? "Processing…" : "Buy data"}
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-4 text-sm text-konek-green font-semibold">{success}</p>}
    </main>
  );
}
