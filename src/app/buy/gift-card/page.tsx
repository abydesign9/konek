"use client";

import { redirectIfKycGate } from "@/lib/kyc/gateRedirect";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";

interface Plan {
  id: string;
  external_id: string;
  name: string;
  price_minor: string;
  network: string; // brand
}

interface MyCard {
  id: string;
  code: string | null;
  amountMinor: number;
  brand: string;
  name: string | null;
  purchasedAt: string;
}

function money(minor: number) {
  return `₦${(minor / 100).toLocaleString()}`;
}

export default function GiftCardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"buy" | "mine">("buy");

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState<string | null>(null);
  const [selected, setSelected] = useState<Plan | null>(null);

  const [myCards, setMyCards] = useState<MyCard[] | null>(null);

  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/catalog?serviceType=gift_card")
      .then((r) => r.json())
      .then((d) => {
        setPlans(d.plans ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  function loadMine() {
    fetch("/api/gift-cards/me")
      .then((r) => r.json())
      .then((d) => setMyCards(d.cards ?? []))
      .catch(() => setMyCards([]));
  }

  const brands = useMemo(() => {
    const filtered = plans.filter((p) => p.network.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase()));
    return Array.from(new Set(filtered.map((p) => p.network))).sort();
  }, [plans, search]);

  const brandPlans = useMemo(() => plans.filter((p) => p.network === brand), [plans, brand]);

  async function submit(finalPin: string) {
    setLoading(true);
    setError("");
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceType: "gift_card",
        network: selected!.network,
        phone: "na",
        planExternalId: selected!.external_id,
        pin: finalPin,
        idempotencyKey: crypto.randomUUID(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.status === 428) {
      router.push(`/settings/pin?next=${encodeURIComponent("/buy/gift-card")}`);
      return;
    }
    if (redirectIfKycGate(res, data)) return;
    if (!res.ok) {
      setError(data.error ?? "Purchase failed");
      setShowPin(false);
      return;
    }
    if (data.status === "failed") {
      setError("The vendor declined this purchase. No funds were charged.");
      setShowPin(false);
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="rounded-3xl border border-indigo/10 bg-white p-8 text-center">
          <div className="mb-4 text-5xl">🎁</div>
          <h1 className="text-xl font-bold text-indigo">Gift card purchased</h1>
          <p className="mt-3 text-sm text-indigo/60">Find the code in “My gift cards”.</p>
          <button
            onClick={() => { setSuccess(false); setSelected(null); setBrand(null); setTab("mine"); loadMine(); }}
            className="mt-6 rounded-xl bg-indigo px-8 py-3 font-semibold text-white"
          >
            View my gift cards
          </button>
        </div>
      </main>
    );
  }

  if (showPin) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-xs">
          <h1 className="mb-1 text-center text-lg font-bold text-indigo">Confirm {selected?.name}</h1>
          <p className="mb-6 text-center text-sm text-indigo/60">{money(Number(selected?.price_minor ?? 0))}</p>
          <PinPad value={pin} onChange={setPin} onComplete={submit} />
          {loading && <p className="mt-4 text-center text-sm text-indigo/50">Processing…</p>}
          {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
          <button onClick={() => { setShowPin(false); setPin(""); }} className="mt-6 block mx-auto text-sm text-indigo/60 underline">
            Cancel
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="Gift cards" backHref="/connect" />
      <div className="mx-auto max-w-lg px-5 py-6">
        {/* Tabs */}
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-indigo/5 p-1">
          <button
            onClick={() => setTab("buy")}
            className={`rounded-xl py-2.5 text-sm font-semibold ${tab === "buy" ? "bg-white text-indigo shadow-sm" : "text-indigo/60"}`}
          >
            Buy gift card
          </button>
          <button
            onClick={() => { setTab("mine"); if (myCards === null) loadMine(); }}
            className={`rounded-xl py-2.5 text-sm font-semibold ${tab === "mine" ? "bg-white text-indigo shadow-sm" : "text-indigo/60"}`}
          >
            My gift cards
          </button>
        </div>

        {tab === "buy" && (
          <>
            {/* Brand detail (amount picker) */}
            {brand ? (
              <>
                <button onClick={() => { setBrand(null); setSelected(null); }} className="mb-3 text-sm font-semibold text-raviion-green">
                  ← All gift cards
                </button>
                <h2 className="mb-3 text-center font-heading text-lg font-bold text-indigo">{brand}</h2>
                <p className="mb-2 text-sm font-semibold text-indigo">Amount to buy</p>
                <div className="grid grid-cols-2 gap-3">
                  {brandPlans.map((p) => {
                    const active = selected?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelected(p)}
                        className={`rounded-2xl border px-4 py-3 text-left ${active ? "border-raviion-green bg-raviion-green/10" : "border-indigo/15 bg-white"}`}
                      >
                        <p className="text-sm font-semibold text-indigo">{p.name}</p>
                        <p className="mt-1 text-sm font-bold text-raviion-green">{money(Number(p.price_minor))}</p>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => { if (!selected) return setError("Choose an amount"); setError(""); setShowPin(true); }}
                  disabled={!selected}
                  className="mt-8 w-full rounded-2xl bg-indigo py-3.5 font-semibold text-white disabled:opacity-40"
                >
                  Buy gift card
                </button>
                {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}
              </>
            ) : (
              <>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search gift cards…"
                  className="mb-4 w-full rounded-xl border border-indigo/20 px-4 py-3 text-sm"
                />
                {!loaded ? (
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-indigo/5" />)}
                  </div>
                ) : brands.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-indigo/20 px-4 py-8 text-center text-sm text-indigo/50">
                    No gift cards available yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {brands.map((b) => (
                      <button
                        key={b}
                        onClick={() => { setBrand(b); setSelected(null); }}
                        className="raviion-tile flex h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-indigo/10 bg-white p-4"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo/5 text-xl">🎁</span>
                        <span className="text-center text-sm font-semibold text-indigo">{b}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === "mine" && (
          <>
            {myCards === null && (
              <div className="animate-pulse space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-indigo/5" />)}
              </div>
            )}
            {myCards !== null && myCards.length === 0 && (
              <div className="rounded-2xl border border-indigo/10 bg-white p-8 text-center text-sm text-indigo/55">
                No gift cards yet — buy one and the code shows up here.
              </div>
            )}
            {myCards && myCards.length > 0 && (
              <div className="space-y-3">
                {myCards.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-indigo/10 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-indigo">{c.name ?? c.brand}</p>
                      <p className="text-sm font-bold text-indigo">{money(c.amountMinor)}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between rounded-xl bg-indigo/5 px-3 py-2">
                      <code className="text-sm text-indigo">{c.code ?? "Processing…"}</code>
                      {c.code && (
                        <button
                          onClick={() => navigator.clipboard.writeText(c.code!)}
                          className="text-xs font-semibold text-raviion-green"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-indigo/40">{new Date(c.purchasedAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
