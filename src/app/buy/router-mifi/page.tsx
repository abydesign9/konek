"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";

interface PlanMeta {
  speed?: string;
  place?: string;
  dataMb?: number;
  validityDays?: number;
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

function naira(minor: number) {
  return `₦${(minor / 100).toLocaleString()}`;
}

function BuyRouterMifi() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [brand, setBrand] = useState<string>("");
  const [selected, setSelected] = useState<Plan | null>(null);
  const [phone, setPhone] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/catalog?serviceType=router_mifi")
      .then((r) => r.json())
      .then((d) => {
        const list: Plan[] = d.plans ?? [];
        setPlans(list);
        setBrand((cur) => cur || list[0]?.network || "");
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const brands = useMemo(() => Array.from(new Set(plans.map((p) => p.network).filter(Boolean))), [plans]);
  const visible = useMemo(() => plans.filter((p) => p.network === brand), [plans, brand]);

  function proceed() {
    if (!selected) return setError("Choose a device or plan");
    if (phone.trim().length < 6) return setError("Enter the delivery / recipient phone number");
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
        serviceType: "router_mifi",
        network: selected!.network,
        phone,
        planExternalId: selected!.external_id,
        pin: finalPin,
        idempotencyKey: crypto.randomUUID(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.status === 428) {
      router.push(`/settings/pin?next=${encodeURIComponent("/buy/router-mifi")}`);
      return;
    }
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setPin("");
      setShowPin(false);
      return;
    }
    if (data.status === "failed") {
      setError("The vendor declined this order. No funds were charged.");
      setPin("");
      setShowPin(false);
      return;
    }
    setSuccess(`${selected?.name} ordered — we'll be in touch on ${phone}.`);
    setTimeout(() => router.push("/home"), 1400);
  }

  if (success) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center text-center">
        <h1 className="font-heading text-xl font-bold text-indigo mb-1">Order placed 📶</h1>
        <p className="text-indigo/60">{success}</p>
      </main>
    );
  }

  if (showPin) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-xs">
          <h1 className="font-heading text-lg font-bold text-indigo mb-1 text-center">Confirm {selected?.name}</h1>
          <p className="text-sm text-indigo/60 mb-8 text-center">Enter your PIN to authorize.</p>
          <PinPad value={pin} onChange={setPin} onComplete={submit} />
          {loading && <p className="mt-4 text-sm text-indigo/60 text-center">Processing…</p>}
          {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}
          <button onClick={() => { setShowPin(false); setPin(""); }} className="mt-6 block mx-auto text-sm text-indigo/60 underline">
            Cancel
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="Router & MiFi" backHref="/connect" />
      <div className="max-w-lg mx-auto px-5 py-6">
        <p className="mb-6 text-sm text-indigo/60">
          Order a MiFi or router and top up its data — mobile internet you can carry anywhere.
        </p>

        {!loaded ? (
          <div className="animate-pulse space-y-3">
            <div className="h-10 rounded-xl bg-indigo/5" />
            <div className="h-24 rounded-2xl bg-indigo/5" />
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-indigo/20 px-4 py-8 text-center text-sm text-indigo/50">
            No router & MiFi products available yet.
          </div>
        ) : (
          <>
            {brands.length > 1 && (
              <div className="konek-scrollbar-none mb-4 flex gap-2 overflow-x-auto">
                {brands.map((b) => (
                  <button
                    key={b}
                    onClick={() => { setBrand(b); setSelected(null); }}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
                      brand === b ? "bg-indigo text-white" : "border border-indigo/15 bg-white text-indigo"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {visible.map((p) => {
                const active = selected?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      active ? "border-konek-green bg-konek-green/10" : "border-indigo/15 bg-white"
                    }`}
                  >
                    <p className="text-sm font-semibold text-indigo">{p.name}</p>
                    {p.meta?.speed && <p className="text-xs text-indigo/55">{p.meta.speed}</p>}
                    <p className="mt-1 text-sm font-semibold text-konek-green">{naira(Number(p.price_minor))}</p>
                  </button>
                );
              })}
            </div>

            <label className="mb-2 mt-6 block text-sm font-semibold text-indigo">Delivery / recipient phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              inputMode="numeric"
              className="w-full rounded-xl border border-indigo/20 px-4 py-3"
            />

            <button
              onClick={proceed}
              disabled={!selected}
              className="mt-8 w-full rounded-2xl bg-indigo px-6 py-3.5 text-center font-semibold text-white disabled:opacity-40"
            >
              Continue
            </button>
            {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
          </>
        )}
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background" />}>
      <BuyRouterMifi />
    </Suspense>
  );
}
