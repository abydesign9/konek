"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

interface CardProduct {
  id: string;
  name: string;
  currency: string;
  formFactor: "virtual" | "physical";
  brand: string;
  description: string | null;
}

// Card catalogue, styled like the reference: Global vs Domestic tabs, each card
// type a tappable row that opens its detail page. Global = foreign-currency
// cards (USD/EUR/GBP); Domestic = local NGN cards.
export default function NewCardPage() {
  const [products, setProducts] = useState<CardProduct[]>([]);
  const [tab, setTab] = useState<"global" | "domestic">("global");

  useEffect(() => {
    fetch("/api/cards/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]));
  }, []);

  const shown = useMemo(
    () => products.filter((p) => (tab === "domestic" ? p.currency === "NGN" : p.currency !== "NGN")),
    [products, tab]
  );

  return (
    <main className="min-h-screen bg-background pb-28">
      <PageHeader title="Get a card" backHref="/cards" />

      <div className="mx-auto max-w-lg px-5 py-6">
        <div className="mb-6 flex gap-2">
          {(["global", "domestic"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-5 py-2 text-sm font-semibold capitalize ${
                tab === t ? "bg-indigo text-white" : "border border-indigo/15 bg-white text-indigo"
              }`}
            >
              {t === "global" ? "🌍 Global" : "📍 Domestic"}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="rounded-3xl border border-indigo/10 bg-white p-8 text-center">
            <div className="mb-2 text-3xl">💳</div>
            <p className="font-semibold text-indigo">No cards here yet</p>
            <p className="mt-1 text-sm text-indigo/55">More card types are on the way.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {shown.map((p) => (
              <Link
                key={p.id}
                href={`/cards/new/${p.id}`}
                className="flex items-center gap-3 rounded-2xl bg-white px-4 py-4 raviion-card-shadow raviion-tile"
              >
                <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-indigo/10 text-lg">
                  {p.formFactor === "physical" ? "💳" : "📲"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-indigo">{p.name}</span>
                  <span className="block text-xs text-indigo/55">
                    {p.description ?? `${p.currency} ${p.formFactor} card`}
                  </span>
                </span>
                <span className="shrink-0 text-indigo/30">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
