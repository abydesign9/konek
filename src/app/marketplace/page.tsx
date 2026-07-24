"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";

interface Product {
  id: string;
  name: string;
  country: string | null;
  region: string | null;
  operator: string | null;
  dataAmount: number; // GB, -1 = unlimited
  validity: number; // days
  networkType: string | null;
  currency: string;
  priceMinor: number;
  onPromo: boolean;
}

type TabType = "country" | "region" | "global";
const TABS: { key: TabType; label: string }[] = [
  { key: "country", label: "Local" },
  { key: "region", label: "Regional" },
  { key: "global", label: "Global" },
];

function price(minor: number, currency: string) {
  const v = minor / 100;
  const sym = currency === "USD" ? "$" : currency === "NGN" ? "₦" : "";
  return `${sym}${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function dataLabel(gb: number) {
  if (gb < 0) return "Unlimited";
  if (gb < 1) return `${Math.round(gb * 1000)}MB`;
  return `${gb}GB`;
}
function flagOf(cc: string | null) {
  if (!cc || cc.length !== 2) return "🌍";
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export default function MarketplacePage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>("country");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);

  // purchase flow
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    setProducts(null);
    fetch(`/api/marketplace/catalog?type=${tab}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]));
  }, [tab]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products ?? []).filter(
      (p) => !q || p.name.toLowerCase().includes(q) || (p.country ?? "").toLowerCase().includes(q) || (p.region ?? "").toLowerCase().includes(q)
    );
  }, [products, search]);

  async function buy(finalPin: string) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/marketplace/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catalogProductId: selected.id, idempotencyKey: crypto.randomUUID(), pin: finalPin }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 428) {
      router.push(`/settings/pin?next=${encodeURIComponent("/marketplace")}`);
      return;
    }
    if (res.status === 403) {
      router.push("/kyc");
      return;
    }
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setPin("");
      setShowPin(false);
      return;
    }
    setDone(
      data.status === "delivered"
        ? "Your eSIM is ready — find it in Connect → eSIM."
        : "Your order is processing. We'll notify you the moment it's ready."
    );
  }

  if (done) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="mb-3 text-4xl">📱</div>
        <h1 className="font-heading text-xl font-bold text-indigo">Order placed 🎉</h1>
        <p className="mt-1 max-w-xs text-sm text-indigo/60">{done}</p>
        <button onClick={() => router.push("/esim")} className="mt-6 rounded-xl bg-indigo px-5 py-3 text-sm font-semibold text-white">
          View my eSIMs
        </button>
      </main>
    );
  }

  if (showPin && selected) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-8">
        <div className="w-full max-w-xs">
          <h1 className="text-center font-heading text-lg font-bold text-indigo">
            Buy {selected.name}
          </h1>
          <p className="mb-8 mt-1 text-center text-sm text-indigo/60">
            {price(selected.priceMinor, selected.currency)} · enter your PIN to confirm.
          </p>
          <PinPad value={pin} onChange={setPin} onComplete={buy} />
          {busy && <p className="mt-4 text-center text-sm text-indigo/60">Processing…</p>}
          {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
          <button
            onClick={() => {
              setShowPin(false);
              setPin("");
            }}
            className="mx-auto mt-6 block text-sm text-indigo/60 underline"
          >
            Cancel
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-28">
      <PageHeader title="eSIM Store" backHref="/connect" />

      <div className="mx-auto max-w-lg px-5 py-4">
        <p className="mb-4 text-sm text-indigo/60">Travel data for 190+ countries. Activated in seconds, delivered instantly.</p>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search a country or region…"
          className="mb-4 w-full rounded-xl border border-indigo/15 bg-white px-4 py-3 text-sm"
        />

        <div className="konek-scrollbar-none mb-5 flex gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
                tab === t.key ? "bg-indigo text-white" : "border border-indigo/15 bg-white text-indigo"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {products === null && (
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-indigo/5" />
            ))}
          </div>
        )}

        {products !== null && visible.length === 0 && (
          <div className="rounded-3xl border border-indigo/10 bg-white p-8 text-center">
            <div className="mb-3 text-4xl">🔍</div>
            <p className="font-semibold text-indigo">No plans here yet</p>
            <p className="mt-1 text-sm text-indigo/55">Try another tab or search.</p>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {visible.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setSelected(p);
                setError(null);
                setShowPin(true);
              }}
              className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left konek-card-shadow konek-tile"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo/5 text-xl">
                {flagOf(p.country)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-indigo">{p.name}</span>
                <span className="block truncate text-xs text-indigo/55">
                  {dataLabel(p.dataAmount)} · {p.validity} days{p.networkType ? ` · ${p.networkType}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-right">
                {p.onPromo && <span className="mb-0.5 block text-[10px] font-bold uppercase text-konek-green">Promo</span>}
                <span className="block text-sm font-bold text-indigo">{price(p.priceMinor, p.currency)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
