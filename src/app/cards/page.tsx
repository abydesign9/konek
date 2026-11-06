"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

interface Card {
  id: string;
  brand: string;
  last4: string;
  status: string;
  currency: string;
}
interface CardResponse {
  cards: Card[];
  balanceMinor: number;
}

function symbol(ccy: string) {
  return ccy === "USD" ? "$" : ccy === "NGN" ? "₦" : ccy === "GBP" ? "£" : ccy === "EUR" ? "€" : "";
}

// Owned-cards home: shows the customer's cards only (tap one to open its
// details/settings), plus an entry point to the card catalogue. The fee
// schedule and description live on each product's detail page, not here.
export default function CardsPage() {
  const [data, setData] = useState<CardResponse | null>(null);

  useEffect(() => {
    fetch("/api/cards/me")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ cards: [], balanceMinor: 0 }));
  }, []);

  const cards = data?.cards ?? [];

  return (
    <main className="min-h-screen bg-background pb-28">
      <PageHeader
        title="Cards"
        backHref="/home"
        right={
          <Link href="/cards/new" className="rounded-full bg-indigo px-3 py-1.5 text-xs font-semibold text-white">
            + New card
          </Link>
        }
      />

      <div className="mx-auto max-w-lg px-5 py-6">
        {!data ? (
          <div className="h-48 animate-pulse rounded-3xl bg-indigo/5" />
        ) : cards.length === 0 ? (
          <div className="overflow-hidden rounded-3xl bg-indigo text-white">
            <div className="p-6">
              <h2 className="text-xl font-bold">Multiple cards for every payment scenario</h2>
              <p className="mt-1 text-sm text-white/70">Spend online worldwide or locally. Choose a card that fits.</p>
            </div>
            <div className="px-6 pb-6">
              <Link href="/cards/new" className="block rounded-2xl bg-white py-3.5 text-center font-semibold text-indigo">
                Get your cards →
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {cards.map((c) => (
              <Link
                key={c.id}
                href={`/cards/${c.id}`}
                className={`block overflow-hidden rounded-3xl p-6 text-white transition-transform active:scale-[0.99] ${
                  c.currency === "NGN" ? "bg-gradient-to-br from-indigo to-blue-600" : "bg-gradient-to-br from-slate-900 to-indigo"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-heading text-lg font-bold">raviion</span>
                  <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase">{c.currency}</span>
                </div>
                <p className="mt-10 text-lg tracking-widest">•••• •••• •••• {c.last4}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-white/70">
                  <span className="uppercase">{c.brand}</span>
                  <span className="capitalize">{c.status}</span>
                </div>
              </Link>
            ))}

            <Link
              href="/cards/new"
              className="rounded-2xl border border-dashed border-indigo/30 py-4 text-center text-sm font-semibold text-indigo"
            >
              + Get another card
            </Link>
          </div>
        )}

        {data && cards.length > 0 && (
          <p className="mt-4 text-center text-xs text-indigo/45">
            Tap a card to view details, freeze, set limits or reveal the number.
          </p>
        )}

        {data && (
          <p className="mt-2 text-center text-xs text-indigo/45">
            Wallet balance available for card fees: {symbol("USD")}
            {(data.balanceMinor / 100).toLocaleString()}
          </p>
        )}
      </div>
    </main>
  );
}
