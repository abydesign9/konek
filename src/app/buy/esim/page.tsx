"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PinPad } from "@/components/PinPad";
import { QrCode } from "@/components/QrCode";
import { esimLpaString } from "@/lib/esim";

interface PlanMeta {
  type?: "country" | "region" | "global";
  dataMb?: number;
  validityDays?: number;
  flag?: string;
  place?: string;
}
interface Plan {
  id: string;
  external_id: string;
  name: string;
  network: string;
  price_minor: string;
  currency: string;
  meta: PlanMeta | null;
}

type PackType = "country" | "region" | "global";
const TABS: { id: PackType; label: string }[] = [
  { id: "country", label: "Country" },
  { id: "region", label: "Region" },
  { id: "global", label: "Global" },
];

function usd(minor: number) {
  return `$${(minor / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

function BuyEsim() {
  const router = useRouter();

  const [tab, setTab] = useState<PackType>("country");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ token: string; txnId: string } | null>(null);

  useEffect(() => {
    fetch(`/api/catalog?serviceType=esim`)
      .then((res) => res.json())
      .then((data) => setPlans(data.plans ?? []));
  }, []);

  const visiblePlans = useMemo(
    () => plans.filter((p) => (p.meta?.type ?? "country") === tab),
    [plans, tab]
  );

  function proceedToPin() {
    if (!selectedPlan) {
      setError("Choose a plan");
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
        network: selectedPlan!.network,
        phone: "na",
        planExternalId: selectedPlan!.external_id,
        pin: finalPin,
        idempotencyKey: crypto.randomUUID(),
      }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (res.status === 428) {
      router.push(`/settings/pin?next=${encodeURIComponent(window.location.pathname)}`);
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
        <h1 className="font-heading text-xl font-bold text-indigo mb-1">eSIM issued 🎉</h1>
        <p className="text-indigo/60 mb-6">Scan in your phone&rsquo;s eSIM settings — {selectedPlan?.name}</p>
        <QrCode value={esimLpaString(issued.token)} size={200} />
        <p className="font-mono text-xs text-indigo/50 mt-4 mb-8 break-all max-w-xs">{issued.token}</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link
            href={`/esim/${issued.txnId}`}
            className="rounded-xl bg-indigo text-white text-center font-semibold px-6 py-3"
          >
            View usage
          </Link>
          <Link
            href="/esim"
            className="rounded-xl border border-indigo/20 text-indigo text-center font-semibold px-6 py-3"
          >
            My eSIMs
          </Link>
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
    <main className="min-h-screen bg-background px-6 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-heading text-xl font-bold text-indigo">Buy eSIM</h1>
        <Link href="/esim" className="text-sm font-semibold text-konek-green hover:underline">
          My eSIMs
        </Link>
      </div>
      <p className="text-sm text-indigo/60 mb-6">
        Instant travel data. Priced in USD, charged from your NGN wallet.
      </p>

      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setSelectedPlan(null);
            }}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
              tab === t.id ? "bg-indigo text-white" : "bg-indigo/10 text-indigo/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 mb-8">
        {visiblePlans.length === 0 && (
          <p className="text-sm text-indigo/50">No {tab} packs synced yet.</p>
        )}
        {visiblePlans.map((plan) => {
          const gb = plan.meta?.dataMb ? plan.meta.dataMb / 1000 : null;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan)}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                selectedPlan?.id === plan.id ? "border-konek-green bg-konek-green/10" : "border-indigo/20 hover:bg-indigo/5"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="text-2xl">{plan.meta?.flag ?? "📶"}</span>
                <span>
                  <span className="block text-sm font-semibold text-indigo">{plan.meta?.place ?? plan.name}</span>
                  <span className="block text-xs text-indigo/50">
                    {gb ? `${gb}GB` : ""} {plan.meta?.validityDays ? `· ${plan.meta.validityDays} days` : ""}
                  </span>
                </span>
              </span>
              <span className="text-sm font-semibold text-indigo">{usd(Number(plan.price_minor))}</span>
            </button>
          );
        })}
      </div>

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
