"use client";

import { useEffect, useState } from "react";
import { BusinessShell } from "@/components/BusinessShell";

interface BizCard {
  id: string;
  label: string | null;
  brand: string;
  last4: string;
  currency: string;
  status: string;
}

interface CardProduct {
  id: string;
  name: string;
  currency: string;
  brand: string;
  creationFeeMinor: number;
}

function fmt(minor: number, currency: string) {
  const sym = currency === "USD" ? "$" : currency === "NGN" ? "₦" : "";
  return `${sym}${(minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function CardsClient() {
  const [businessName, setBusinessName] = useState<string | undefined>();
  const [cards, setCards] = useState<BizCard[] | null>(null);
  const [products, setProducts] = useState<CardProduct[] | null>(null);
  const [showIssue, setShowIssue] = useState(false);
  const [productId, setProductId] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, { pan: string; expMonth: number; expYear: number; cvv: string }>>({});

  function load() {
    fetch("/api/business/me").then((r) => r.json()).then((d) => setBusinessName(d.business?.legal_name));
    fetch("/api/business/cards").then((r) => r.json()).then((d) => setCards(d.cards ?? []));
    fetch("/api/cards/products").then((r) => r.json()).then((d) => setProducts(d.products ?? []));
  }
  useEffect(load, []);

  async function issue() {
    if (!productId) return setError("Choose a card product");
    setError(null);
    setBusy(true);
    const res = await fetch("/api/business/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, label: label || undefined }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(d.error ?? "Could not issue card");
      return;
    }
    setShowIssue(false);
    setLabel("");
    setProductId("");
    load();
  }

  async function toggleFreeze(card: BizCard) {
    await fetch(`/api/business/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frozen: card.status !== "frozen" }),
    });
    load();
  }

  async function reveal(cardId: string) {
    const res = await fetch(`/api/business/cards/${cardId}/reveal`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (res.ok) setRevealed((r) => ({ ...r, [cardId]: d }));
  }

  return (
    <BusinessShell businessName={businessName}>
      <h1 className="mb-1 font-heading text-2xl font-bold text-indigo">Cards</h1>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">Virtual cards issued against the business wallet — for ops, ads, subscriptions and vendor payments.</p>
        <button
          onClick={() => setShowIssue((s) => !s)}
          className="shrink-0 rounded-xl bg-indigo px-4 py-2.5 text-sm font-semibold text-white"
        >
          + New card
        </button>
      </div>

      {showIssue && (
        <div className="konek-card-shadow mb-5 rounded-2xl border border-border-soft bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="rounded-xl border border-border-soft px-3 py-2.5 text-sm">
              <option value="">Choose a card product…</option>
              {(products ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.currency}) — {fmt(p.creationFeeMinor, p.currency)} fee
                </option>
              ))}
            </select>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (e.g. Ops team)"
              className="min-w-0 flex-1 rounded-xl border border-border-soft px-3 py-2.5 text-sm"
            />
            <button onClick={issue} disabled={busy} className="rounded-xl bg-konek-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? "Issuing…" : "Issue"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(cards ?? []).map((c) => (
          <div key={c.id} className="konek-card-shadow rounded-2xl bg-indigo p-5 text-white">
            <p className="text-xs text-white/60">{c.label ?? "Business card"}</p>
            <p className="mt-2 font-heading text-lg font-bold tracking-wider">
              {revealed[c.id] ? revealed[c.id].pan.replace(/(.{4})/g, "$1 ").trim() : `•••• •••• •••• ${c.last4}`}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs text-white/70">
              <span className="uppercase">{c.brand} · {c.currency}</span>
              <span className={`rounded-full px-2 py-0.5 font-semibold ${c.status === "frozen" ? "bg-red-500/20 text-red-100" : "bg-white/15"}`}>
                {c.status}
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => toggleFreeze(c)} className="flex-1 rounded-lg bg-white/15 py-2 text-xs font-semibold">
                {c.status === "frozen" ? "Unfreeze" : "Freeze"}
              </button>
              <button onClick={() => reveal(c.id)} className="flex-1 rounded-lg bg-white/15 py-2 text-xs font-semibold">
                {revealed[c.id] ? `CVV ${revealed[c.id].cvv}` : "Reveal"}
              </button>
            </div>
          </div>
        ))}
        {cards !== null && cards.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-text-secondary">No business cards yet. Issue one above.</p>
        )}
      </div>
    </BusinessShell>
  );
}
