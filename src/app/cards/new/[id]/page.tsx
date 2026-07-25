"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface CardProduct {
  id: string;
  name: string;
  currency: string;
  formFactor: "virtual" | "physical";
  brand: string;
  description: string | null;
  creationFeeMinor: number;
  authorizationFeeMinor: number;
  fundingFeePct: number;
  fundingFeeMinMinor: number;
  fundingFeeMaxMinor: number | null;
  declineFeeMinor: number;
  disputeFeeMinor: number;
  intlFeePct: number;
  intlFeeFixedMinor: number;
}

function sym(ccy: string) {
  return ccy === "USD" ? "$" : ccy === "NGN" ? "₦" : ccy === "GBP" ? "£" : ccy === "EUR" ? "€" : "";
}
function fx(minor: number, ccy: string) {
  return `${sym(ccy)}${(minor / 100).toLocaleString(undefined, { minimumFractionDigits: minor % 100 ? 2 : 0 })}`;
}

export default function CardProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<CardProduct | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fundHref, setFundHref] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cards/products")
      .then((r) => r.json())
      .then((d) => setProduct((d.products ?? []).find((p: CardProduct) => p.id === id) ?? null))
      .finally(() => setLoaded(true));
  }, [id]);

  async function getCard() {
    if (!product) return;
    setBusy(true);
    setError(null);
    setFundHref(null);
    const res = await fetch("/api/cards/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);

    if (res.status === 403) {
      router.push("/kyc");
      return;
    }
    if (d.code === "fee_unpaid") {
      setError(
        product.currency === "NGN"
          ? "Top up your wallet to cover the card fee."
          : `Convert some funds to ${product.currency} to cover the ${fx(product.creationFeeMinor, product.currency)} fee.`
      );
      setFundHref(product.currency === "NGN" ? "/wallet" : "/wallet/dollar-account");
      return;
    }
    if (!res.ok) {
      setError(d.error ?? "Could not create the card");
      return;
    }
    router.push(d.cardId ? `/cards/${d.cardId}` : "/cards");
  }

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-indigo/50">Loading…</p>
      </main>
    );
  }
  if (!product) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-5 py-4">
          <Link href="/cards/new" className="text-sm font-semibold text-indigo">← Back</Link>
        </div>
        <p className="px-5 py-10 text-center text-sm text-indigo/55">That card type is not available.</p>
      </main>
    );
  }

  const funding =
    product.fundingFeePct > 0
      ? `${product.fundingFeePct}%${product.fundingFeeMinMinor ? ` · min ${fx(product.fundingFeeMinMinor, product.currency)}` : ""}${
          product.fundingFeeMaxMinor ? ` · max ${fx(product.fundingFeeMaxMinor, product.currency)}` : ""
        }`
      : "No fee. This card is linked to your wallet balance.";
  const intl =
    product.intlFeePct || product.intlFeeFixedMinor
      ? `${product.intlFeePct ? `${product.intlFeePct}%` : ""}${product.intlFeePct && product.intlFeeFixedMinor ? " + " : ""}${
          product.intlFeeFixedMinor ? fx(product.intlFeeFixedMinor, product.currency) : ""
        }`
      : fx(0, product.currency);

  return (
    <main className="min-h-screen bg-background pb-40">
      <div className={`${product.currency === "NGN" ? "bg-indigo" : "bg-slate-900"} px-5 pb-14 pt-4 text-white`}>
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <Link
            href="/cards/new"
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
          >
            ←
          </Link>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo">
            {product.currency} {product.formFactor === "physical" ? "Physical" : "Virtual"} Card
          </span>
        </div>
        <div className="mx-auto mt-4 max-w-lg">
          <h1 className="font-heading text-2xl font-bold">{product.name}</h1>
          <p className="mt-1 text-sm text-white/70">
            {product.brand.toUpperCase()} · {product.currency} {product.formFactor}
          </p>
        </div>
      </div>

      <div className="mx-auto -mt-6 max-w-lg px-5">
        <div className="rounded-3xl border border-indigo/10 bg-white p-5">
          <p className="mb-3 font-bold text-indigo">Details and description</p>
          {product.description && <p className="mb-4 text-sm text-indigo/70">{product.description}</p>}

          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo/40">Fees</p>
          <div className="divide-y divide-indigo/5 rounded-2xl border border-indigo/10">
            <FeeLine label="Card creation fee" value={fx(product.creationFeeMinor, product.currency)} />
            <FeeLine label="Authorization fee" hint="Per card transaction" value={fx(product.authorizationFeeMinor, product.currency)} />
            <FeeLine label="Funding fee" value={funding} />
            <FeeLine label="Decline fee" hint="On declines due to low balance" value={fx(product.declineFeeMinor, product.currency)} />
            <FeeLine label="Dispute fee" hint="When you file a dispute" value={fx(product.disputeFeeMinor, product.currency)} />
            <FeeLine label="International fee" hint="On non-local websites" value={intl} />
          </div>

          <div className="mt-4 rounded-2xl bg-indigo/5 px-4 py-3 text-xs text-indigo/60">
            {product.currency === "NGN"
              ? "This card links directly to your Naira wallet. Delivery is instant."
              : `Funded from your ${product.currency} wallet — convert from your Naira wallet anytime, no separate account needed.`}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-indigo/10 bg-background/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-lg">
          {error && (
            <p className="mb-2 text-center text-sm text-red-600">
              {error}
              {fundHref && (
                <Link href={fundHref} className="ml-2 font-semibold text-konek-green underline">
                  Add funds →
                </Link>
              )}
            </p>
          )}
          <button
            onClick={getCard}
            disabled={busy}
            className="w-full rounded-2xl bg-indigo py-4 font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Creating…" : `Get ${product.name} for ${fx(product.creationFeeMinor, product.currency)}`}
          </button>
        </div>
      </div>
    </main>
  );
}

function FeeLine({ label, hint, value }: { label: string; hint?: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm text-indigo">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-indigo/45">{hint}</p>}
      </div>
      <p className="shrink-0 text-right text-sm font-semibold text-indigo">{value}</p>
    </div>
  );
}
